import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLocation, useMatch, useNavigate } from "react-router-dom";
import { fetchChatHistory, sendChatMessage, type ChatPageContext } from "../api";
import BrandMark from "./BrandMark";
import { useAuth } from "../context/AuthContext";
import { useSearchResults } from "../context/SearchResultsContext";
import "./ChatWidget.css";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  matchCount?: number;
}

const GREETING: ChatMessage = {
  role: "assistant",
  content: "Hi! I'm the Campus Customs assistant. Ask me about products, sizes, or stock.",
};

function usePageContext(): ChatPageContext {
  const location = useLocation();
  const productMatch = useMatch("/products/:productId");

  if (productMatch?.params.productId) {
    return { page: "product", product_id: productMatch.params.productId };
  }
  if (location.pathname === "/") return { page: "home" };
  if (location.pathname.startsWith("/products")) return { page: "products" };
  if (location.pathname === "/about") return { page: "about" };
  if (location.pathname === "/login") return { page: "login" };
  if (location.pathname === "/create-account") return { page: "create-account" };
  return { page: "other" };
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const navigate = useNavigate();
  const { setResults } = useSearchResults();
  const { user, token } = useAuth();
  const pageContext = usePageContext();
  const loadedHistoryFor = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages, sending, open]);

  // A logged-in shopper's chat history is stored server-side (Problem 8); hydrate the
  // panel with it whenever they arrive with a session. Guests always start fresh.
  useEffect(() => {
    if (!token || !user) {
      loadedHistoryFor.current = null;
      setMessages([GREETING]);
      return;
    }
    if (loadedHistoryFor.current === user.id) return;
    loadedHistoryFor.current = user.id;

    fetchChatHistory(token)
      .then((history) => {
        if (history.length === 0) return;
        setMessages(
          history.map((m) => ({
            role: m.role,
            content: m.content,
            matchCount: m.products.length > 0 ? m.products.length : undefined,
          })),
        );
      })
      .catch(() => {
        /* keep the default greeting if history can't be loaded */
      });
  }, [token, user]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setSending(true);

    try {
      const data = await sendChatMessage(text, { token, page: pageContext });
      const hasMatches = data.products.length > 0;

      // API contract: the agent returns structured product matches; the front end is
      // responsible for rendering them as cards on the page (Problem 7), not just in
      // the chat transcript. Updating the Products page is what "dynamically show
      // those matching items as product cards" means here.
      if (hasMatches) {
        setResults(text, data.products);
        navigate("/products");
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply,
          matchCount: hasMatches ? data.products.length : undefined,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I couldn't reach the shop assistant. Is the backend running?",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="chat-widget">
      {open && (
        <div className="chat-panel" role="dialog" aria-label="Campus Customs chat assistant">
          <div className="chat-header">
            <div className="chat-header-title">
              <span className="chat-avatar">
                <BrandMark size={20} />
              </span>
              <div>
                <div className="chat-header-name">Campus Customs</div>
                <div className="chat-header-status">
                  <span className="chat-status-dot" /> Usually replies instantly
                </div>
              </div>
            </div>
            <button aria-label="Close chat" onClick={() => setOpen(false)}>
              ×
            </button>
          </div>
          <div className="chat-messages" role="log" aria-live="polite" aria-label="Conversation">
            {messages.map((m, i) => (
              <div key={i} className={`chat-bubble ${m.role}`}>
                {m.content}
                {m.matchCount !== undefined && (
                  <button className="chat-view-products" onClick={() => navigate("/products")}>
                    View {m.matchCount} match{m.matchCount === 1 ? "" : "es"} on the Products page →
                  </button>
                )}
              </div>
            ))}
            {sending && (
              <div className="chat-bubble assistant chat-typing" aria-label="Assistant is typing">
                <span />
                <span />
                <span />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <form className="chat-input-row" onSubmit={handleSubmit}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about products..."
              aria-label="Message"
              disabled={sending}
            />
            <button type="submit" disabled={sending}>
              Send
            </button>
          </form>
        </div>
      )}
      <button
        className={`chat-toggle ${open ? "is-open" : ""}`}
        aria-label={open ? "Close chat" : "Open chat"}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="chat-toggle-icon-bubble" aria-hidden="true">
          <BrandMark size={26} />
        </span>
        <span className="chat-toggle-icon-close" aria-hidden="true">
          ×
        </span>
      </button>
    </div>
  );
}
