import { useEffect, useState } from "react";
import { fetchProduct, type Product } from "../api";
import { useRecentlyViewed } from "../context/RecentlyViewedContext";
import ProductGrid from "./ProductGrid";
import "./RecentlyViewed.css";

interface RecentlyViewedProps {
  /** Exclude this product_id from the strip -- e.g. the product page currently being viewed. */
  exclude?: string;
  title?: string;
}

export default function RecentlyViewed({ exclude, title = "Recently viewed" }: RecentlyViewedProps) {
  const { productIds } = useRecentlyViewed();
  const [products, setProducts] = useState<Product[]>([]);

  const ids = productIds.filter((id) => id !== exclude).slice(0, 4);

  useEffect(() => {
    if (ids.length === 0) {
      setProducts([]);
      return;
    }
    let cancelled = false;
    Promise.all(ids.map((id) => fetchProduct(id).catch(() => null))).then((results) => {
      if (!cancelled) setProducts(results.filter((p): p is Product => p !== null));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(",")]);

  if (products.length === 0) return null;

  return (
    <section className="recently-viewed">
      <h2>{title}</h2>
      <ProductGrid products={products} />
    </section>
  );
}
