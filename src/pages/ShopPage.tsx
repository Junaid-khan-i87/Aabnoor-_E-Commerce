import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X } from 'lucide-react';
import { useCart } from '../CartContext';
import { ProductCard } from '../components/ProductGrid';
import { SEO, SEO_SITE_URL } from '../components/SEO';
import { TrustBadges } from '../components/TrustBadges';
import { SHOP_CONCERNS, withProductCounts } from '../data/categories';
import { useProducts } from '../ProductContext';
import { getActivePrice, isFlashSaleActive } from '../lib/pricing';
import { normalize } from '../data/categories';

export function ShopPage() {
  const { productsList } = useProducts();
  const { addToCart } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);
  const [selectedConcerns, setSelectedConcerns] = useState<string[]>([]);
  const [saleOnly, setSaleOnly] = useState(false);
  const [sortBy, setSortBy] = useState('popular');
  const [maxPrice, setMaxPrice] = useState(0);

  const categories = useMemo(() => withProductCounts(productsList), [productsList]);
  const highestPrice = useMemo(
    () => Math.ceil(Math.max(0, ...productsList.map((product) => getActivePrice(product)))),
    [productsList]
  );

  useEffect(() => {
    if (highestPrice > 0 && maxPrice === 0) {
      setMaxPrice(highestPrice);
    }
  }, [highestPrice, maxPrice]);

  useEffect(() => {
    const category = searchParams.get('category');
    const subcategory = searchParams.get('subcategory');
    const sale = searchParams.get('sale') === 'true';
    const concern = searchParams.get('concern');

    setSelectedCategories(category ? [category] : []);
    setSelectedSubcategories(subcategory ? [subcategory] : []);
    setSelectedConcerns(concern ? [concern] : []);
    setSaleOnly(sale);
  }, [searchParams]);

  const availableSubcategories = useMemo(() => {
    const scopedCategories = selectedCategories.length
      ? categories.filter((category) => selectedCategories.includes(category.name))
      : categories.filter((category) => !category.isSale);

    return scopedCategories.flatMap((category) =>
      category.subcategories.map((subcategory) => ({
        ...subcategory,
        category: category.name,
      }))
    );
  }, [categories, selectedCategories]);

  const filteredProducts = useMemo(() => {
    const next = productsList.filter((product) => {
      const price = getActivePrice(product);
      const haystack = [
        product.name,
        product.category,
        product.subCategory,
        product.description,
        product.fullDetails,
        product.ingredients,
      ].join(' ').toLowerCase();

      const matchesCategory =
        selectedCategories.length === 0 || selectedCategories.includes(product.category);
      const matchesSubcategory =
        selectedSubcategories.length === 0 ||
        selectedSubcategories.some((subcategory) =>
          saleOnly && matchesSaleSegment(product, subcategory)
            ? true
            : normalize(product.subCategory) === normalize(subcategory)
        );
      const matchesSale =
        !saleOnly || isFlashSaleActive(product) || Boolean(product.compareAtPrice && product.compareAtPrice > product.price);
      const matchesPrice = !maxPrice || price <= maxPrice;
      const matchesConcern =
        selectedConcerns.length === 0 ||
        selectedConcerns.some((concernId) => {
          const concern = SHOP_CONCERNS.find((item) => item.id === concernId);
          return concern ? concern.terms.some((term) => haystack.includes(term)) : false;
        });

      return matchesCategory && matchesSubcategory && matchesSale && matchesPrice && matchesConcern;
    });

    if (sortBy === 'price-asc') {
      next.sort((a, b) => getActivePrice(a) - getActivePrice(b));
    } else if (sortBy === 'price-desc') {
      next.sort((a, b) => getActivePrice(b) - getActivePrice(a));
    } else if (sortBy === 'newest') {
      next.sort((a, b) => Number(Boolean(b.isNew)) - Number(Boolean(a.isNew)));
    } else {
      next.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    return next;
  }, [maxPrice, productsList, saleOnly, selectedCategories, selectedConcerns, selectedSubcategories, sortBy]);

  const activeFilters = [
    ...selectedCategories.map((value) => ({ type: 'category' as const, label: value, value })),
    ...selectedSubcategories.map((value) => ({ type: 'subcategory' as const, label: value, value })),
    ...selectedConcerns.map((value) => ({
      type: 'concern' as const,
      label: SHOP_CONCERNS.find((concern) => concern.id === value)?.label || value,
      value,
    })),
    ...(saleOnly ? [{ type: 'sale' as const, label: 'Sale', value: 'sale' }] : []),
    ...(maxPrice && highestPrice && maxPrice < highestPrice
      ? [{ type: 'price' as const, label: `Under Rs. ${maxPrice}`, value: 'price' }]
      : []),
  ];

  const toggleValue = (value: string, values: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  };

  const removeFilter = (filter: (typeof activeFilters)[number]) => {
    if (filter.type === 'category') {
      setSelectedCategories((current) => current.filter((value) => value !== filter.value));
    } else if (filter.type === 'subcategory') {
      setSelectedSubcategories((current) => current.filter((value) => value !== filter.value));
    } else if (filter.type === 'concern') {
      setSelectedConcerns((current) => current.filter((value) => value !== filter.value));
    } else if (filter.type === 'sale') {
      setSaleOnly(false);
    } else {
      setMaxPrice(highestPrice);
    }
  };

  const clearAll = () => {
    setSearchParams({});
    setSelectedCategories([]);
    setSelectedSubcategories([]);
    setSelectedConcerns([]);
    setSaleOnly(false);
    setSortBy('popular');
    setMaxPrice(highestPrice);
  };

  return (
    <>
      <SEO
        title="Shop Aabnoor Beaute | Skincare, Makeup, Hair Care and Fragrance"
        description="Filter Aabnoor Beaute products by category, concern, price and sale status. Shop premium skincare, makeup, hair care and fragrance in Pakistan."
        canonicalPath="/shop"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'Aabnoor Beaute Shop',
          url: `${SEO_SITE_URL}/shop`,
        }}
      />
      <main className="bg-[#F9F7F2] pt-40 lg:pt-44">
        <section className="border-b border-[#2c2826]/10 bg-[#fffaf7]">
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-6 py-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
            <div>
              <p className="mb-3 font-sans text-[10px] font-bold uppercase tracking-[0.3em] text-[#8a4f48]">
                Aabnoor Shop
              </p>
              <h1 className="font-serif text-5xl leading-tight text-[#2c2826] md:text-6xl">
                Shop by routine, concern, and offer.
              </h1>
            </div>
            <p className="font-sans text-sm leading-7 text-[#5f5650] lg:max-w-xl">
              Browse the full catalog with current product data. Use category, subcategory,
              price and concern filters to find the right skincare, makeup, hair care or fragrance item.
            </p>
          </div>
        </section>

        <TrustBadges />

        <section className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-6 py-10 lg:grid-cols-[280px_1fr] lg:py-14">
          <aside className="h-fit rounded-[8px] border border-[#2c2826]/10 bg-white p-5 shadow-sm lg:sticky lg:top-36">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-[#2c2826]">
                <SlidersHorizontal className="h-4 w-4" />
                Filters
              </h2>
              {activeFilters.length > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="font-sans text-[10px] font-bold uppercase tracking-widest text-[#8a4f48] hover:text-[#2c2826]"
                >
                  Clear
                </button>
              )}
            </div>

            <FilterGroup title="Category">
              {categories.map((category) => (
                <React.Fragment key={category.name}>
                  <FilterCheckbox
                    label={category.name}
                    count={category.count}
                    checked={category.isSale ? saleOnly : selectedCategories.includes(category.name)}
                    onChange={() => {
                      if (category.isSale) {
                        setSaleOnly((current) => !current);
                      } else {
                        toggleValue(category.name, selectedCategories, setSelectedCategories);
                      }
                    }}
                  />
                </React.Fragment>
              ))}
            </FilterGroup>

            <FilterGroup title="Subcategory">
              <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
                {availableSubcategories.map((subcategory) => (
                  <React.Fragment key={`${subcategory.category}-${subcategory.name}`}>
                    <FilterCheckbox
                      label={subcategory.name}
                      count={subcategory.count}
                      checked={selectedSubcategories.includes(subcategory.name)}
                      onChange={() => toggleValue(subcategory.name, selectedSubcategories, setSelectedSubcategories)}
                    />
                  </React.Fragment>
                ))}
              </div>
            </FilterGroup>

            <FilterGroup title="Max Price">
              <div className="space-y-3">
                <div className="flex items-center justify-between font-sans text-xs font-bold text-[#2c2826]">
                  <span>Rs. 0</span>
                  <span>Rs. {maxPrice || highestPrice}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={highestPrice || 0}
                  value={maxPrice || highestPrice || 0}
                  onChange={(event) => {
                    setMaxPrice(Number(event.target.value));
                  }}
                  className="w-full accent-[#8a4f48]"
                  aria-label="Maximum price"
                />
              </div>
            </FilterGroup>

            <FilterGroup title="Concern">
              <div className="flex flex-wrap gap-2">
                {SHOP_CONCERNS.map((concern) => {
                  const active = selectedConcerns.includes(concern.id);
                  return (
                    <button
                      key={concern.id}
                      type="button"
                      onClick={() => toggleValue(concern.id, selectedConcerns, setSelectedConcerns)}
                      className={`rounded-full border px-3 py-2 font-sans text-[10px] font-bold uppercase tracking-widest transition-colors ${
                        active
                          ? 'border-[#8a4f48] bg-[#8a4f48] text-white'
                          : 'border-[#2c2826]/12 text-[#2c2826] hover:border-[#8a4f48]'
                      }`}
                    >
                      {concern.label}
                    </button>
                  );
                })}
              </div>
            </FilterGroup>
          </aside>

          <div>
            <div className="mb-6 flex flex-col gap-4 border-b border-[#2c2826]/10 pb-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-[#8a4f48]">
                  {filteredProducts.length} product{filteredProducts.length === 1 ? '' : 's'} found
                </p>
                <h2 className="mt-1 font-serif text-3xl text-[#2c2826]">Curated catalog</h2>
              </div>
              <label className="flex items-center gap-3 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-[#5f5650]">
                Sort
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                  className="rounded-full border border-[#2c2826]/15 bg-white px-4 py-2 text-[#2c2826] outline-none focus:border-[#8a4f48] focus:ring-2 focus:ring-[#CDA185]/35"
                >
                  <option value="popular">Popular</option>
                  <option value="newest">Newest</option>
                  <option value="price-asc">Price: low to high</option>
                  <option value="price-desc">Price: high to low</option>
                </select>
              </label>
            </div>

            {activeFilters.length > 0 && (
              <div className="mb-8 flex flex-wrap items-center gap-2">
                {activeFilters.map((filter) => (
                  <button
                    key={`${filter.type}-${filter.value}`}
                    type="button"
                    onClick={() => removeFilter(filter)}
                    className="inline-flex items-center gap-2 rounded-full border border-[#2c2826]/12 bg-white px-3 py-2 font-sans text-[10px] font-bold uppercase tracking-widest text-[#2c2826] transition-colors hover:border-[#8a4f48] hover:text-[#8a4f48]"
                  >
                    {filter.label}
                    <X className="h-3 w-3" />
                  </button>
                ))}
              </div>
            )}

            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 gap-x-8 gap-y-14 sm:grid-cols-2 xl:grid-cols-3">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} addToCart={addToCart} />
                ))}
              </div>
            ) : (
              <div className="rounded-[8px] border border-[#2c2826]/10 bg-white p-10 text-center">
                <p className="font-serif text-3xl italic text-[#2c2826]">No products matched.</p>
                <p className="mx-auto mt-3 max-w-md font-sans text-sm leading-6 text-[#5f5650]">
                  Try removing a filter or visit the full catalog again.
                </p>
                <Link
                  to="/shop"
                  onClick={clearAll}
                  className="mt-6 inline-flex rounded-full bg-[#2c2826] px-6 py-3 font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-[#8a4f48]"
                >
                  Reset filters
                </Link>
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-t border-[#2c2826]/10 py-5">
      <legend className="mb-3 font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#6f625c]">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function FilterCheckbox({
  label,
  count,
  checked,
  onChange,
}: {
  label: string;
  count: number;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 font-sans text-sm text-[#2c2826]">
      <span className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="h-4 w-4 rounded border-[#2c2826]/20 accent-[#8a4f48]"
        />
        {label}
      </span>
      <span className="font-sans text-[10px] font-bold text-[#6f625c]">{count}</span>
    </label>
  );
}

function matchesSaleSegment(product: { isFlashSale?: boolean; isNew?: boolean; isLimitedEdition?: boolean }, label: string) {
  const normalized = normalize(label);
  if (normalized === normalize('Flash Deals')) return Boolean(product.isFlashSale);
  if (normalized === normalize('New Arrivals')) return Boolean(product.isNew);
  if (normalized === normalize('Limited Editions')) return Boolean(product.isLimitedEdition);
  return false;
}
