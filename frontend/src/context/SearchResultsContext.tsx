import { createContext, useContext, useState, type ReactNode } from "react";
import type { ChatProductCard } from "../api";

interface SearchResultsValue {
  query: string | null;
  products: ChatProductCard[] | null;
  setResults: (query: string, products: ChatProductCard[]) => void;
  clear: () => void;
}

const SearchResultsContext = createContext<SearchResultsValue | null>(null);

export function SearchResultsProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState<string | null>(null);
  const [products, setProducts] = useState<ChatProductCard[] | null>(null);

  function setResults(newQuery: string, newProducts: ChatProductCard[]) {
    setQuery(newQuery);
    setProducts(newProducts);
  }

  function clear() {
    setQuery(null);
    setProducts(null);
  }

  return (
    <SearchResultsContext.Provider value={{ query, products, setResults, clear }}>
      {children}
    </SearchResultsContext.Provider>
  );
}

export function useSearchResults(): SearchResultsValue {
  const ctx = useContext(SearchResultsContext);
  if (!ctx) throw new Error("useSearchResults must be used within SearchResultsProvider");
  return ctx;
}
