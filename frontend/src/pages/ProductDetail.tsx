import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchProduct, type Product, API_BASE } from "../api";
import RecentlyViewed from "../components/RecentlyViewed";
import { useRecentlyViewed } from "../context/RecentlyViewedContext";
import "./ProductDetail.css";

const COLOR_SWATCHES: Record<string, string> = {
  navy: "#1c2b4a",
  "navy blue": "#1c2b4a",
  "dark navy": "#141d33",
  white: "#ffffff",
  ivory: "#f3ecdd",
  "heather gray": "#a8a8ac",
  "dark heather gray": "#7a7a7e",
  "charcoal gray": "#4b4d52",
  gray: "#9a9a9e",
  "light gray": "#c7c7cb",
  black: "#111214",
  red: "#b0242c",
  green: "#2f5d3a",
  yellow: "#e3c04a",
  blue: "#2c5697",
  "dusty coral": "#d98f7f",
  "charcoal gray/white": "#4b4d52",
};

function swatchColor(name: string): string {
  return COLOR_SWATCHES[name.toLowerCase()] ?? "#d8d3c6";
}

function ProductDetailSkeleton() {
  return (
    <div className="product-detail">
      <div className="back-link skeleton" style={{ width: 120, height: 16 }} />
      <div className="product-detail-grid">
        <div className="skeleton" style={{ aspectRatio: "1 / 1", borderRadius: "var(--radius-lg)" }} />
        <div className="product-detail-info">
          <div className="skeleton" style={{ width: 100, height: 12, marginBottom: 14 }} />
          <div className="skeleton" style={{ width: "70%", height: 34, marginBottom: 12 }} />
          <div className="skeleton" style={{ width: 90, height: 24, marginBottom: 20 }} />
          <div className="skeleton" style={{ width: "100%", height: 14, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: "90%", height: 14, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: "60%", height: 14 }} />
        </div>
      </div>
    </div>
  );
}

export default function ProductDetail() {
  const { productId } = useParams<{ productId: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const { addViewed } = useRecentlyViewed();

  useEffect(() => {
    setProduct(null);
    setError(null);
    setSelectedSize(null);
    window.scrollTo({ top: 0 });
    if (!productId) return;
    fetchProduct(productId)
      .then((p) => {
        setProduct(p);
        addViewed(p.product_id);
      })
      .catch(() => setError("Could not find that product."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  if (error) return <div className="products-status error">{error}</div>;
  if (!product) return <ProductDetailSkeleton />;

  const selectedLine = product.inventory.find((line) => line.size === selectedSize);

  return (
    <div className="product-detail fade-up">
      <Link to="/products" className="back-link">
        ← Back to Products
      </Link>
      <div className="product-detail-grid">
        <div className="product-detail-image">
          <img src={`${API_BASE}${product.image_url}`} alt={product.name} />
        </div>
        <div className="product-detail-info">
          <span className="product-detail-eyebrow">{product.garment_type}</span>
          <h1>{product.name}</h1>
          <p className="product-detail-price">${product.price.toFixed(2)}</p>
          <p className="product-detail-desc">{product.description}</p>

          <h3>Colors</h3>
          <div className="swatch-row">
            {product.colors.map((c) => (
              <span key={c} className="swatch" title={c}>
                <span className="swatch-dot" style={{ background: swatchColor(c) }} />
                {c}
              </span>
            ))}
          </div>

          <h3>Size</h3>
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
        </div>
      </div>

      <RecentlyViewed exclude={product.product_id} />
    </div>
  );
}
