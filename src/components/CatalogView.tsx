import { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, Star, X, ShoppingBag, Info, ShieldAlert } from 'lucide-react';
import { Product, FilterState } from '../types';
import { CATEGORIES } from '../data';

interface CatalogViewProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
  onSelectProduct: (product: Product) => void;
}

export default function CatalogView({ products, onAddToCart, onSelectProduct }: CatalogViewProps) {
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    category: 'All',
    minPrice: 0,
    maxPrice: 500,
    sortBy: 'featured',
  });

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  // Pagination state for "All" category
  const [visibleCount, setVisibleCount] = useState(6);

  // Reset visible products count when filter state changes
  useEffect(() => {
    setVisibleCount(6);
  }, [filters]);

  // Filter and sort products
  const filteredProducts = products
    .filter((product) => {
      // Status filter (only show Active products in the shop catalog)
      if (product.status !== 'Active') return false;

      // Search query filter
      const matchesSearch =
        product.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        product.description.toLowerCase().includes(filters.search.toLowerCase());

      // Category filter
      const matchesCategory =
        filters.category === 'All' || product.category === filters.category;

      // Price filter
      const matchesPrice =
        product.price >= filters.minPrice && product.price <= filters.maxPrice;

      return matchesSearch && matchesCategory && matchesPrice;
    })
    .sort((a, b) => {
      if (filters.sortBy === 'featured') {
        return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
      }
      if (filters.sortBy === 'price-asc') {
        return a.price - b.price;
      }
      if (filters.sortBy === 'price-desc') {
        return b.price - a.price;
      }
      if (filters.sortBy === 'rating') {
        return b.rating - a.rating;
      }
      return 0;
    });

  const isAllCategory = filters.category === 'All';
  const displayedProducts = isAllCategory
    ? filteredProducts.slice(0, visibleCount)
    : filteredProducts;

  const handleResetFilters = () => {
    setFilters({
      search: '',
      category: 'All',
      minPrice: 0,
      maxPrice: 500,
      sortBy: 'featured',
    });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8" id="catalog-container">
      {/* Catalog Hero Banner (Purely Visual Decorative Banner) */}
      <div 
        className="mb-10 rounded-2xl h-48 sm:h-64 md:h-72 w-full relative overflow-hidden bg-cover bg-center border border-gray-100 shadow-sm" 
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=1600&q=80')" }}
        id="hero-banner"
      />

      {/* Main Catalog Content */}
      <div className="lg:grid lg:grid-cols-4 lg:gap-x-8">
        {/* Desktop Sidebar Filters */}
        <aside className="hidden lg:block" id="desktop-filters">
          <div className="sticky top-24 divide-y divide-gray-100 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            {/* Search Filter */}
            <div className="pb-5">
              <h3 className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-400">Search Products</h3>
              <div className="relative mt-3">
                <input
                  type="text"
                  placeholder="Type to search..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 py-2.5 pl-3 pr-10 text-sm focus:border-gray-900 focus:outline-none"
                  id="search-input-desktop"
                />
                <Search className="absolute right-3 top-3 h-4.5 w-4.5 text-gray-400" />
              </div>
            </div>

            {/* Categories Filter */}
            <div className="py-5">
              <h3 className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Category</h3>
              <div className="space-y-1.5">
                {CATEGORIES.map((category) => (
                  <button
                    key={category}
                    onClick={() => setFilters({ ...filters, category })}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 font-sans text-sm transition-colors ${
                      filters.category === category
                        ? 'bg-gray-900 font-medium text-white'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span>{category}</span>
                    {category === 'All' && (
                      <span className="font-mono text-xs opacity-75">({products.filter(p => p.status === 'Active').length})</span>
                    )}
                    {category !== 'All' && (
                      <span className="font-mono text-xs opacity-75">
                        ({products.filter(p => p.category === category && p.status === 'Active').length})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Filter */}
            <div className="py-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-400">Max Price</h3>
                <span className="font-mono text-sm font-medium text-gray-900">৳{filters.maxPrice}</span>
              </div>
              <input
                type="range"
                min="0"
                max="500"
                step="10"
                value={filters.maxPrice}
                onChange={(e) => setFilters({ ...filters, maxPrice: parseInt(e.target.value) })}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-gray-100 accent-gray-900"
                id="price-range-desktop"
              />
              <div className="mt-2 flex justify-between font-mono text-[10px] text-gray-400">
                <span>৳0</span>
                <span>৳500</span>
              </div>
            </div>

            {/* Reset Button */}
            <div className="pt-5">
              <button
                onClick={handleResetFilters}
                className="flex w-full items-center justify-center rounded-lg border border-gray-200 py-2.5 font-sans text-sm font-medium text-gray-600 hover:bg-gray-50"
                id="reset-filters-btn"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </aside>

        {/* Product Grid Area */}
        <div className="lg:col-span-3">
          {/* Controls Bar */}
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 pb-6 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowFiltersMobile(!showFiltersMobile)}
                className="flex items-center space-x-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 lg:hidden"
                id="mobile-filters-toggle"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span>Filters</span>
              </button>
              <p className="font-sans text-sm text-gray-500" id="results-count">
                Showing <span className="font-semibold text-gray-900">
                  {isAllCategory ? `${displayedProducts.length} of ${filteredProducts.length}` : filteredProducts.length}
                </span> products
              </p>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center space-x-2">
              <label htmlFor="sort-select" className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-400">
                Sort By
              </label>
              <select
                id="sort-select"
                value={filters.sortBy}
                onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as any })}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 focus:border-gray-900 focus:outline-none"
              >
                <option value="featured">Featured</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="rating">Top Rated</option>
              </select>
            </div>
          </div>

          {/* Mobile Filter Drawer (Conditional Expand) */}
          {showFiltersMobile && (
            <div className="mt-4 rounded-xl border border-gray-100 bg-white p-4 shadow-md lg:hidden animate-in fade-in-50 slide-in-from-top-4 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                <span className="font-sans text-sm font-semibold text-gray-900">Filters</span>
                <button onClick={() => setShowFiltersMobile(false)}>
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              </div>

              {/* Mobile Search */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-400 uppercase mb-1.5">Search</label>
                <input
                  type="text"
                  placeholder="Search products..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 py-2 px-3 text-sm"
                  id="search-input-mobile"
                />
              </div>

              {/* Mobile Categories */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-400 uppercase mb-1.5">Category</label>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map((category) => (
                    <button
                      key={category}
                      onClick={() => setFilters({ ...filters, category })}
                      className={`rounded-full px-3 py-1 font-sans text-xs transition-colors ${
                        filters.category === category
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mobile Price */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-gray-400 uppercase">Max Price</label>
                  <span className="font-mono text-xs font-medium text-gray-900">৳{filters.maxPrice}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="500"
                  step="10"
                  value={filters.maxPrice}
                  onChange={(e) => setFilters({ ...filters, maxPrice: parseInt(e.target.value) })}
                  className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-gray-100 accent-gray-900"
                  id="price-range-mobile"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  onClick={handleResetFilters}
                  className="w-1/2 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-600"
                >
                  Reset
                </button>
                <button
                  onClick={() => setShowFiltersMobile(false)}
                  className="w-1/2 rounded-lg bg-gray-900 py-2 text-xs font-medium text-white"
                >
                  Apply
                </button>
              </div>
            </div>
          )}

          {/* Product Grid */}
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center" id="empty-catalog-state">
              <div className="rounded-full bg-gray-50 p-4">
                <SlidersHorizontal className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="mt-4 font-sans text-base font-semibold text-gray-900">No products match</h3>
              <p className="mt-1 font-sans text-sm text-gray-500 max-w-xs">
                Try adjusting your filters, resetting, or typing a different search phrase.
              </p>
              <button
                onClick={handleResetFilters}
                className="mt-6 rounded-lg bg-gray-900 px-4 py-2 font-sans text-sm font-medium text-white shadow hover:bg-gray-800"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <>
              <div className="mt-8 grid grid-cols-1 min-[380px]:grid-cols-2 gap-y-8 gap-x-4 sm:gap-y-10 sm:gap-x-6 sm:grid-cols-2 lg:grid-cols-3 xl:gap-x-8" id="products-grid">
                {displayedProducts.map((product) => (
                <div key={product.id} className="group relative flex flex-col justify-between" id={`product-card-${product.id}`}>
                  {/* Image Container */}
                  <div 
                    onClick={() => onSelectProduct(product)}
                    className="relative aspect-square w-full overflow-hidden rounded-xl border border-gray-100 bg-gray-50 transition-all group-hover:shadow-md cursor-pointer"
                  >
                    <img
                      src={product.image}
                      alt={product.name}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                    />

                    {/* Quick View Button on Hover */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        className="flex items-center space-x-1 rounded-full bg-white px-4 py-2 font-sans text-xs font-semibold text-gray-900 shadow-lg hover:bg-gray-50 active:scale-95 transition-transform"
                      >
                        <Info className="h-3.5 w-3.5 text-[#B88E4C]" />
                        <span>View Details</span>
                      </button>
                    </div>

                    {/* Stock Alert Badge */}
                    {product.inventory === 0 ? (
                      <span className="absolute top-3 left-3 rounded-full bg-red-100 px-2.5 py-0.5 font-sans text-[10px] font-semibold text-red-700 uppercase tracking-wider">
                        Out of Stock
                      </span>
                    ) : product.inventory <= 5 ? (
                      <span className="absolute top-3 left-3 rounded-full bg-amber-100 px-2.5 py-0.5 font-sans text-[10px] font-semibold text-amber-700 uppercase tracking-wider">
                        Only {product.inventory} left
                      </span>
                    ) : null}

                    {/* Featured Badge */}
                    {product.featured && (
                      <span className="absolute top-3 right-3 rounded-full bg-gray-900/90 px-2.5 py-0.5 font-sans text-[10px] font-semibold text-white uppercase tracking-wider">
                        Featured
                      </span>
                    )}
                  </div>

                  {/* Info Row */}
                  <div className="mt-4 flex flex-col">
                    <div className="flex items-center justify-between text-left">
                      <span className="font-sans text-xs text-gray-400 uppercase tracking-wider font-semibold">
                        {product.category}
                      </span>
                      <div className="flex items-center font-mono text-xs text-gray-500">
                        <Star className="mr-1 h-3 w-3 fill-amber-400 text-amber-400" />
                        <span>{product.rating}</span>
                      </div>
                    </div>

                    <h3 className="mt-1 font-sans text-sm font-bold text-gray-950 text-left line-clamp-1 group-hover:text-[#B88E4C] transition-colors">
                      <button onClick={() => onSelectProduct(product)} className="focus:outline-none">
                        {product.name}
                      </button>
                    </h3>

                    <p className="mt-1.5 font-mono text-sm font-extrabold text-gray-900 text-left">
                      ৳{product.price.toFixed(2)}
                    </p>

                    <button
                      onClick={() => onAddToCart(product)}
                      disabled={product.inventory === 0}
                      className={`mt-4 flex w-full items-center justify-center space-x-1.5 rounded-lg py-2.5 font-sans text-xs font-semibold shadow-sm transition-all ${
                        product.inventory === 0
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-[#1E2D44] text-white hover:bg-[#152031] active:scale-[0.98]'
                      }`}
                    >
                      <ShoppingBag className="h-3.5 w-3.5" />
                      <span>{product.inventory === 0 ? 'Sold Out' : 'Add to Cart'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Load More or Reached End Message */}
            {isAllCategory && (
              <div className="mt-8 sm:mt-12 flex flex-col items-center justify-center border-t border-gray-100 pt-6 sm:pt-8 px-4" id="pagination-controls">
                {filteredProducts.length > visibleCount ? (
                  <button
                    onClick={() => setVisibleCount((prev) => prev + 6)}
                    className="w-full sm:w-auto rounded-xl border-2 border-[#1E2D44]/10 bg-white hover:bg-[#1E2D44]/5 hover:border-[#1E2D44]/30 px-6 py-3 sm:px-8 sm:py-3.5 font-sans text-xs sm:text-sm font-bold text-[#1E2D44] active:scale-[0.98] transition-all shadow-sm flex items-center justify-center gap-2 touch-manipulation min-h-[44px]"
                    id="load-more-btn"
                  >
                    <ShoppingBag className="h-4 w-4 text-[#1E2D44]" />
                    <span>Load More Products</span>
                  </button>
                ) : (
                  <div className="font-sans text-xs sm:text-sm text-gray-500 bg-gray-50 rounded-2xl px-5 py-3 sm:px-6 sm:py-3 border border-gray-100 text-center w-full max-w-sm sm:max-w-md shadow-sm" id="reached-end-msg">
                    ✨ You have reached the end. Do a search to keep exploring!
                  </div>
                )}
              </div>
            )}
          </>
        )}
        </div>
      </div>
    </div>
  );
}
