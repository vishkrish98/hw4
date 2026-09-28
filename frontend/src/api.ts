export const API_BASE = "http://localhost:8000";

export interface InventoryLine {
  size: string;
  quantity: number;
}

export interface Product {
  product_id: string;
  name: string;
  garment_type: string;
  description: string;
  colors: string[];
  search_tags: string[];
  image_file_path: string;
  image_url: string;
  price: number;
  inventory: InventoryLine[];
  total_stock: number;
}

export async function fetchProducts(): Promise<Product[]> {
  const res = await fetch(`${API_BASE}/api/products`);
  if (!res.ok) throw new Error("Failed to load products");
  return res.json();
}

export async function fetchProduct(productId: string): Promise<Product> {
  const res = await fetch(`${API_BASE}/api/products/${productId}`);
  if (!res.ok) throw new Error("Failed to load product");
  return res.json();
}

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  name: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

async function parseErrorDetail(res: Response): Promise<string> {
  try {
    const data = await res.json();
    return data.detail ?? "Something went wrong";
  } catch {
    return "Something went wrong";
  }
}

export async function registerUser(input: {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  confirm_password: string;
}): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseErrorDetail(res));
  return res.json();
}

export async function loginUser(input: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseErrorDetail(res));
  return res.json();
}

export async function fetchMe(token: string): Promise<User> {
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Session expired");
  return res.json();
}

export async function logoutUser(token: string): Promise<void> {
  await fetch(`${API_BASE}/api/auth/logout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export interface ChatProductCard {
  product_id: string;
  name: string;
  garment_type: string;
  description: string;
  price: number;
  image_url: string;
  colors: string[];
  inventory: InventoryLine[];
  total_stock: number;
}

export interface ChatApiResponse {
  reply: string;
  products: ChatProductCard[];
}

export interface ChatPageContext {
  page: string;
  product_id?: string;
}

export async function sendChatMessage(
  message: string,
  opts: { token?: string | null; page?: ChatPageContext } = {},
): Promise<ChatApiResponse> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;

  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify({ message, page: opts.page ?? null }),
  });
  if (!res.ok) throw new Error("Chat request failed");
  return res.json();
}

export interface ChatHistoryMessage {
  role: "user" | "assistant";
  content: string;
  products: ChatProductCard[];
}

export async function fetchChatHistory(token: string): Promise<ChatHistoryMessage[]> {
  const res = await fetch(`${API_BASE}/api/chat/history`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to load chat history");
  return res.json();
}
