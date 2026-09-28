import secrets
import sqlite3

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, EmailStr

from db import get_connection
from security import hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


def ensure_sessions_table(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
        """
    )
    conn.commit()


class RegisterRequest(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    password: str
    confirm_password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


def public_user(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "first_name": row["first_name"],
        "last_name": row["last_name"],
        "name": row["name"],
        "email": row["email"],
    }


def create_session(conn: sqlite3.Connection, user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    conn.execute("INSERT INTO sessions (token, user_id) VALUES (?, ?)", (token, user_id))
    conn.commit()
    return token


def _extract_token(authorization: str | None) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    return authorization.removeprefix("Bearer ").strip()


def get_user_from_token(token: str) -> dict | None:
    """Resolve a bearer token to a public user dict, or None if invalid/expired."""
    conn = get_connection()
    try:
        ensure_sessions_table(conn)
        session = conn.execute(
            "SELECT user_id FROM sessions WHERE token = ?", (token,)
        ).fetchone()
        if session is None:
            return None
        user = conn.execute(
            "SELECT * FROM users WHERE id = ?", (session["user_id"],)
        ).fetchone()
        if user is None:
            return None
        return public_user(user)
    finally:
        conn.close()


def _current_user(authorization: str | None) -> sqlite3.Row:
    token = _extract_token(authorization)
    conn = get_connection()
    try:
        ensure_sessions_table(conn)
        session = conn.execute(
            "SELECT user_id FROM sessions WHERE token = ?", (token,)
        ).fetchone()
        if session is None:
            raise HTTPException(status_code=401, detail="Session expired or invalid")
        user = conn.execute(
            "SELECT * FROM users WHERE id = ?", (session["user_id"],)
        ).fetchone()
        if user is None:
            raise HTTPException(status_code=401, detail="User no longer exists")
        return user
    finally:
        conn.close()


@router.post("/register", status_code=201)
def register(payload: RegisterRequest):
    if payload.password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    if len(payload.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    conn = get_connection()
    try:
        ensure_sessions_table(conn)
        existing = conn.execute(
            "SELECT id FROM users WHERE email = ?", (payload.email.lower(),)
        ).fetchone()
        if existing is not None:
            raise HTTPException(status_code=409, detail="Email already registered")

        password_hash = hash_password(payload.password)
        full_name = f"{payload.first_name} {payload.last_name}".strip()
        cursor = conn.execute(
            """
            INSERT INTO users (name, email, password_hash, first_name, last_name)
            VALUES (?, ?, ?, ?, ?)
            """,
            (full_name, payload.email.lower(), password_hash, payload.first_name, payload.last_name),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM users WHERE id = ?", (cursor.lastrowid,)).fetchone()
        token = create_session(conn, row["id"])
        return {"token": token, "user": public_user(row)}
    finally:
        conn.close()


@router.post("/login")
def login(payload: LoginRequest):
    conn = get_connection()
    try:
        ensure_sessions_table(conn)
        row = conn.execute(
            "SELECT * FROM users WHERE email = ?", (payload.email.lower(),)
        ).fetchone()
        if row is None or not verify_password(payload.password, row["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        token = create_session(conn, row["id"])
        return {"token": token, "user": public_user(row)}
    finally:
        conn.close()


@router.get("/me")
def me(authorization: str | None = Header(default=None)):
    return public_user(_current_user(authorization))


@router.post("/logout", status_code=204)
def logout(authorization: str | None = Header(default=None)):
    token = _extract_token(authorization)
    conn = get_connection()
    try:
        ensure_sessions_table(conn)
        conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
        conn.commit()
    finally:
        conn.close()
    return None
