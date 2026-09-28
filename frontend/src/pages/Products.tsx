import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchProducts, type Product } from "../api";
import ProductGrid from "../components/ProductGrid";
import ProductFilters, { type PriceBounds } from "../components/ProductFilters";
import { useSearchResults } from "../context/SearchResultsContext";
import "./Products.css";

interface Filterable {
  name: string;
  garment_type: string;
  description: string;
  colors: string[];
  price: number;
}

const CATEGORY_ORDER = ["Hoodies", "Crewnecks", "T-Shirts & Tees", "Jackets & Fleece", "Quarter-Zips", "Other"];

type SortOption = "recommended" | "price-asc" | "price-desc" | "name-asc" | "name-desc";

const SORT_LABELS: Record<SortOption, string> = {
  recommended: "Recommended",
  "price-asc": "Price: Low to High",
  "price-desc": "Price: High to Low",
  "name-asc": "Name: A to Z",
  "name-desc": "Name: Z to A",
};

function categorize(garmentType: string): string {
  const g = garmentType.toLowerCase();
  if (g.includes("quarter-zip") || g.includes("quarter zip")) return "Quarter-Zips";
  if (g.includes("hood")) return "Hoodies";
  if (g.includes("crewneck") || g.includes("crew-neck") || g.includes("raglan") || g.includes("mockneck")) {
    return "Crewnecks";
  }
  if (g.includes("jacket") || g.includes("fleece")) return "Jackets & Fleece";
  if (g.includes("shirt") || g.includes("tee")) return "T-Shirts & Tees";
  return "Other";
}

function matchesText(product: Filterable, text: string): boolean {
  const needle = text.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [product.name, product.garment_type, product.description, ...product.colors]
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

function ProductGridSkeleton() {
  return (
    <div className="product-grid">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i}>
          <div className="skeleton" style={{ aspectRatio: "1 / 1", marginBottom: "0.9rem" }} />
          <div className="skeleton" style={{ width: "70%", height: 14, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: "40%", height: 12 }} />
        </div>
      ))}
    </div>
  );
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("filter") ?? "");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const { query, products: chatProducts, clear } = useSearchResults();

  const priceBounds: PriceBounds = useMemo(() => {
    if (products.length === 0) return { min: 0, max: 100 };
    const prices = products.map((p) => p.price);
    return { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) };
  }, [products]);

  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(() => {
    const initial = searchParams.get("category");
    return initial ? new Set([initial]) : new Set();
  });
  const [selectedColors, setSelectedColors] = useState<Set<string>>(new Set());
  const [priceRange, setPriceRange] = useState<PriceBounds | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("recommended");

  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .catch(() => setError("Could not load products. Is the backend running?"))
      .finally(() => setLoading(false));
  }, []);

  const effectivePriceRange = priceRange ?? priceBounds;

  const availableCategories = useMemo(() => {
    const present = new Set(products.map((p) => categorize(p.garment_type)));
    return CATEGORY_ORDER.filter((c) => present.has(c));
  }, [products]);

  const availableColors = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) {
      for (const c of p.colors) counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([color]) => color);
  }, [products]);

  const showingChatResults = chatProducts !== null;
  const baseProducts = showingChatResults ? chatProducts! : products;

  const visibleProducts = useMemo(() => {
    const filtered = baseProducts.filter((p) => {
      if (!matchesText(p, search)) return false;
      if (selectedCategories.size > 0 && !selectedCategories.has(categorize(p.garment_type))) return false;
      if (selectedColors.size > 0 && !p.colors.some((c) => selectedColors.has(c))) return false;
      if (p.price < effectivePriceRange.min || p.price > effectivePriceRange.max) return false;
      return true;
    });

    if (sortBy === "recommended") return filtered;
    const sorted = [...filtered];
    switch (sortBy) {
      case "price-asc":
        sorted.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        sorted.sort((a, b) => b.price - a.price);
        break;
      case "name-asc":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
    }
    return sorted;
  }, [baseProducts, search, selectedCategories, selectedColors, effectivePriceRange, sortBy]);

  function toggleCategory(category: string) {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  function toggleColor(color: string) {
    setSelectedColors((prev) => {
      const next = new Set(prev);
      if (next.has(color)) next.delete(color);
      else next.add(color);
      return next;
    });
  }

  function clearAllFilters() {
    setSelectedCategories(new Set());
    setSelectedColors(new Set());
    setPriceRange(null);
    setSearch("");
  }

  const activeFilterCount =
    selectedCategories.size +
    selectedColors.size +
    (priceRange && (priceRange.min !== priceBounds.min || priceRange.max !== priceBounds.max) ? 1 : 0);

  return (
    <div className="products-page">
      <div className="products-header">
        <h1>Products</h1>
        <div className="products-header-actions">
          <input
            className="products-filter"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, type, or color..."
            aria-label="Search products"
          />
          <button
            className="mobile-filters-toggle"
            aria-expanded={mobileFiltersOpen}
            aria-controls="products-filters-panel"
            onClick={() => setMobileFiltersOpen((o) => !o)}
          >
            Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ""}
          </button>
        </div>
      </div>

      {showingChatResults && (
        <div className="chat-results-banner">
          <p>
            Showing <strong>{chatProducts!.length}</strong> match
            {chatProducts!.length === 1 ? "" : "es"} the shop assistant found for “{query}”.
          </p>
          <button onClick={clear}>Show all products</button>
        </div>
      )}

      <div className="products-layout">
        <aside id="products-filters-panel" className={`products-sidebar ${mobileFiltersOpen ? "open" : ""}`}>
          <ProductFilters
            categories={availableCategories}
            selectedCategories={selectedCategories}
            onToggleCategory={toggleCategory}
            colors={availableColors}
            selectedColors={selectedColors}
            onToggleColor={toggleColor}
            priceBounds={priceBounds}
            priceRange={effectivePriceRange}
            onPriceChange={setPriceRange}
            onClearAll={clearAllFilters}
            activeCount={activeFilterCount}
          />
        </aside>

        <div className="products-main">
          {!loading && !error && (
            <div className="products-toolbar">
              <span className="products-count">
                {visibleProducts.length} product{visibleProducts.length === 1 ? "" : "s"}
              </span>
              <label className="products-sort">
                Sort by
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)}>
                  {(Object.keys(SORT_LABELS) as SortOption[]).map((option) => (
                    <option key={option} value={option}>
                      {SORT_LABELS[option]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
          {loading ? (
            <ProductGridSkeleton />
          ) : error ? (
            <div className="products-status error">{error}</div>
          ) : visibleProducts.length === 0 ? (
            <div className="products-status">No products match your filters.</div>
          ) : (
            <ProductGrid products={visibleProducts} />
          )}
        </div>
      </div>
    </div>
  );
}
