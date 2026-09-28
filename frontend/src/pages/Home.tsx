import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE, fetchProducts, type Product } from "../api";
import ProductGrid from "../components/ProductGrid";
import RecentlyViewed from "../components/RecentlyViewed";
import { useAuth } from "../context/AuthContext";
import "./Home.css";

const HERO_PRODUCT_ID = "brooks-brothers-bomber-jacket-yale";

const CATEGORY_TILES = [
  { label: "Hoodies", category: "Hoodies", productId: "basic-hoodie-big-yale" },
  { label: "Crewnecks", category: "Crewnecks", productId: "baseball-left-chest-crewneck" },
  { label: "T-Shirts", category: "T-Shirts & Tees", productId: "2025-yale-vs-harvard-t-shirt" },
];

export default function Home() {
  const [featured, setFeatured] = useState<Product[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    fetchProducts()
      .then((all) => setFeatured(all.slice(0, 4)))
      .catch(() => setFeatured([]));
  }, []);

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-text fade-up">
          {user ? (
            <>
              <h1>Welcome back, {user.first_name}.</h1>
              <p>Pick up where you left off, or see what's new this season.</p>
            </>
          ) : (
            <>
              <h1>
                Casual comfort.
                <br />
                Real Bulldog pride.
              </h1>
              <p>Everyday layers for students, families, and alumni. Built for New Haven winters.</p>
            </>
          )}
          <Link to="/products" className="hero-cta">
            Shop now
          </Link>
        </div>
        <img
          className="hero-image"
          src={`${API_BASE}/media/products/${HERO_PRODUCT_ID}.jpg`}
          alt=""
        />
      </section>

      <section className="category-row">
        {CATEGORY_TILES.map((tile) => (
          <Link
            key={tile.label}
            to={`/products?category=${encodeURIComponent(tile.category)}`}
            className="category-tile"
          >
            <img src={`${API_BASE}/media/products/${tile.productId}.jpg`} alt={tile.label} />
            <span className="category-tile-label">
              {tile.label}
              <span aria-hidden="true">→</span>
            </span>
          </Link>
        ))}
      </section>

      <RecentlyViewed title="Pick up where you left off" />

      {featured.length > 0 && (
        <section className="featured">
          <div className="featured-header">
            <h2>New this season</h2>
            <Link to="/products" className="featured-link">
              View all
            </Link>
          </div>
          <ProductGrid products={featured} />
        </section>
      )}

      <section className="promise-row">
        <div>
          <strong>For every Bulldog</strong>
          <p>Students, parents, grandparents, and every residential college in between.</p>
        </div>
        <div>
          <strong>Built to last</strong>
          <p>Heavyweight cotton and honest construction, made for four years and beyond.</p>
        </div>
        <div>
          <strong>Game day ready</strong>
          <p>From The Game against Harvard to a Saturday on Old Campus.</p>
        </div>
      </section>
    </div>
  );
}
