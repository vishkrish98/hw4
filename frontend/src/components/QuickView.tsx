import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE, fetchProduct, type Product } from "../api";
import "./QuickView.css";

interface QuickViewProps {
  productId: string;
  onClose: () => void;
}

export default function QuickView({ productId, onClose }: QuickViewProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const navigate = useNavigate();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = "quick-view-title";

  useEffect(() => {
    setProduct(null);
    setSelectedSize(null);
    fetchProduct(productId).then(setProduct).catch(() => onClose());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  useEffect(() => {
    // Move focus into the dialog on open, and trap Tab within it -- without this a
    // keyboard/screen-reader user's focus stays "behind" the modal on the page underneath.
    closeButtonRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const dialog = document.getElementById("quick-view-dialog");
      if (!dialog) return;
      const focusable = dialog.querySelectorAll<HTMLElement>(
        'button:not(:disabled), a[href], input, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const selectedLine = product?.inventory.find((line) => line.size === selectedSize);

  return (
    <div className="quick-view-backdrop" onClick={onClose}>
      <div
        id="quick-view-dialog"
        className="quick-view-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={product ? titleId : undefined}
        aria-busy={!product}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          ref={closeButtonRef}
          className="quick-view-close"
          aria-label="Close quick view"
          onClick={onClose}
        >
          ×
        </button>
        {!product ? (
          <div className="quick-view-loading" aria-live="polite" aria-label="Loading product">
            <div className="skeleton" style={{ aspectRatio: "1 / 1" }} />
            <div>
              <div className="skeleton" style={{ width: "60%", height: 26, marginBottom: 12 }} />
              <div className="skeleton" style={{ width: 80, height: 20 }} />
            </div>
          </div>
        ) : (
          <div className="quick-view-body">
            <div className="quick-view-image">
              <img src={`${API_BASE}${product.image_url}`} alt={product.name} />
            </div>
            <div className="quick-view-info">
              <span className="quick-view-eyebrow">{product.garment_type}</span>
              <h2 id={titleId}>{product.name}</h2>
              <p className="quick-view-price">${product.price.toFixed(2)}</p>
              <p className="quick-view-desc">{product.description}</p>

              <div className="size-row" role="group" aria-label="Select a size">
                {product.inventory.map((line) => {
                  const outOfStock = line.quantity === 0;
                  return (
                    <button
                      key={line.size}
                      type="button"
                      disabled={outOfStock}
                      aria-pressed={selectedSize === line.size}
                      aria-label={outOfStock ? `Size ${line.size}, out of stock` : `Size ${line.size}`}
                      className={`size-pill ${selectedSize === line.size ? "selected" : ""} ${outOfStock ? "unavailable" : ""}`}
                      onClick={() => setSelectedSize(line.size)}
                    >
                      {line.size}
                    </button>
                  );
                })}
              </div>
              <p className="size-status" aria-live="polite">
                {selectedLine
                  ? selectedLine.quantity === 0
                    ? `${selectedLine.size} is currently out of stock.`
                    : `${selectedLine.quantity} in stock in size ${selectedLine.size}.`
                  : "Select a size to check stock."}
              </p>

              <button
                className="quick-view-full-link"
                onClick={() => {
                  onClose();
                  navigate(`/products/${product.product_id}`);
                }}
              >
                View full details →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
