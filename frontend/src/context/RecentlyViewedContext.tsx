import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "campus_customs_recently_viewed";
const MAX_ITEMS = 8;

interface RecentlyViewedValue {
  productIds: string[];
  addViewed: (productId: string) => void;
}

const RecentlyViewedContext = createContext<RecentlyViewedValue | null>(null);

function readStored(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function RecentlyViewedProvider({ children }: { children: ReactNode }) {
  const [productIds, setProductIds] = useState<string[]>(() => readStored());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(productIds));
  }, [productIds]);

  function addViewed(productId: string) {
    setProductIds((prev) => [productId, ...prev.filter((id) => id !== productId)].slice(0, MAX_ITEMS));
  }

  return (
    <RecentlyViewedContext.Provider value={{ productIds, addViewed }}>
      {children}
    </RecentlyViewedContext.Provider>
  );
}

export function useRecentlyViewed(): RecentlyViewedValue {
  const ctx = useContext(RecentlyViewedContext);
  if (!ctx) throw new Error("useRecentlyViewed must be used within RecentlyViewedProvider");
  return ctx;
}
