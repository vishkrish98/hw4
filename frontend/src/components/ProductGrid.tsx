import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE } from "../api";
import QuickView from "./QuickView";
import "./ProductGrid.css";

export interface GridProduct {
  product_id: string;
  name: string;
  price: number;
  description: string;
  image_url: string;
}

interface ProductGridProps {
  products: GridProduct[];
}

/**
 * Shared product-card grid: used for the full catalogue (Problem 3) and for the live
 * results the chat agent surfaces (Problem 7) -- same cards, same click-through to the
 * single-item detail page, so a card behaves identically no matter where it came from.
 * Also offers a Quick View overlay so a shopper can check price/size/stock without leaving
 * the grid at all.
 *
 * The image and title are each their own <Link> (not a div with an onClick) so the whole
 * card is reachable and activatable with a keyboard, not just a mouse; Quick View is a
 * sibling button rather than nested inside a link, which keeps the markup valid and lets
 * screen readers announce it as a distinct action.
 */
export default function ProductGrid({ products }: ProductGridProps) {
  const [quickViewId, setQuickViewId] = useState<string | null>(null);
  const lastTriggerRef = useRef<HTMLElement | null>(null);

  function openQuickView(e: React.MouseEvent<HTMLButtonElement>, productId: string) {
    lastTriggerRef.current = e.currentTarget;
    setQuickViewId(productId);
  }

  function closeQuickView() {
    setQuickViewId(null);
    lastTriggerRef.current?.focus();
  }

  return (
    <div className="product-grid">
      {products.map((p) => (
        <div key={p.product_id} className="product-card">
          <div className="product-card-image-wrap">
            <Link
              to={`/products/${p.product_id}`}
              className="product-card-image-link"
              aria-label={`${p.name}, $${p.price.toFixed(2)}`}
            >
              <div className="product-card-image">
                <img src={`${API_BASE}${p.image_url}`} alt="" loading="lazy" />
              </div>
            </Link>
            <button
              className="quick-view-trigger"
              aria-label={`Quick view ${p.name}`}
              onClick={(e) => openQuickView(e, p.product_id)}
            >
              Quick view
            </button>
          </div>
          <div className="product-card-body">
            <Link to={`/products/${p.product_id}`} className="product-card-title-link">
              <div className="product-card-heading">
                <h3>{p.name}</h3>
                <span className="product-price">${p.price.toFixed(2)}</span>
              </div>
            </Link>
            <p className="product-desc">{p.description}</p>
          </div>
        </div>
      ))}
      {quickViewId && <QuickView productId={quickViewId} onClose={closeQuickView} />}
    </div>
  );
}
