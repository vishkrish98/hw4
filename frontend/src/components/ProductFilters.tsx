import "./ProductFilters.css";

export interface PriceBounds {
  min: number;
  max: number;
}

interface ProductFiltersProps {
  categories: string[];
  selectedCategories: Set<string>;
  onToggleCategory: (category: string) => void;

  colors: string[];
  selectedColors: Set<string>;
  onToggleColor: (color: string) => void;

  priceBounds: PriceBounds;
  priceRange: PriceBounds;
  onPriceChange: (range: PriceBounds) => void;

  onClearAll: () => void;
  activeCount: number;
}

export default function ProductFilters({
  categories,
  selectedCategories,
  onToggleCategory,
  colors,
  selectedColors,
  onToggleColor,
  priceBounds,
  priceRange,
  onPriceChange,
  onClearAll,
  activeCount,
}: ProductFiltersProps) {
  return (
    <div className="product-filters">
      <div className="product-filters-header">
        <h3>Filters</h3>
        {activeCount > 0 && (
          <button className="filters-clear" onClick={onClearAll}>
            Clear all ({activeCount})
          </button>
        )}
      </div>

      <fieldset className="filter-group">
        <legend>Category</legend>
        <div className="filter-checkbox-list">
          {categories.map((c) => (
            <label key={c} className="filter-checkbox">
              <input
                type="checkbox"
                checked={selectedCategories.has(c)}
                onChange={() => onToggleCategory(c)}
              />
              {c}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="filter-group">
        <h4 id="price-filter-label">Price</h4>
        <div className="price-range-labels">
          <span>${priceRange.min}</span>
          <span>${priceRange.max}</span>
        </div>
        <div className="price-slider">
          <input
            type="range"
            min={priceBounds.min}
            max={priceBounds.max}
            value={priceRange.min}
            aria-label="Minimum price"
            aria-describedby="price-filter-label"
            onChange={(e) => {
              const next = Math.min(Number(e.target.value), priceRange.max);
              onPriceChange({ ...priceRange, min: next });
            }}
          />
          <input
            type="range"
            min={priceBounds.min}
            max={priceBounds.max}
            value={priceRange.max}
            aria-label="Maximum price"
            aria-describedby="price-filter-label"
            onChange={(e) => {
              const next = Math.max(Number(e.target.value), priceRange.min);
              onPriceChange({ ...priceRange, max: next });
            }}
          />
        </div>
      </div>

      <div className="filter-group" role="group" aria-label="Color">
        <h4>Color</h4>
        <div className="filter-color-list">
          {colors.map((color) => (
            <button
              key={color}
              aria-pressed={selectedColors.has(color)}
              className={`filter-color-chip ${selectedColors.has(color) ? "active" : ""}`}
              onClick={() => onToggleColor(color)}
            >
              {color}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
