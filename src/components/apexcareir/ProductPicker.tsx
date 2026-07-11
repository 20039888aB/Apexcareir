import { useEffect, useMemo, useRef, useState } from 'react';
import type { Product } from '../../services';

type ProductPickerProps = {
  products: Product[];
  productId: string;
  productName: string;
  onSelect: (product: Product) => void;
  onNameChange: (name: string) => void;
  onClear?: () => void;
  isLoading?: boolean;
};

function formatProductLabel(product: Product) {
  return `${product.product_number ? `${product.product_number} · ` : ''}${product.name} (${product.sku}) · Stock: ${product.current_stock}`;
}

export default function ProductPicker({
  products,
  productId,
  productName,
  onSelect,
  onNameChange,
  onClear,
  isLoading = false,
}: ProductPickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const filteredProducts = useMemo(() => {
    const query = productName.trim().toLowerCase();
    const matches = query
      ? products.filter(
          (product) =>
            product.name.toLowerCase().includes(query) ||
            product.sku.toLowerCase().includes(query) ||
            (product.product_number || '').toLowerCase().includes(query),
        )
      : products;
    return matches.slice(0, 12);
  }, [productName, products]);

  const isNewProduct = Boolean(productName.trim()) && !productId;

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <div ref={containerRef} className="relative sm:col-span-2">
      <label className="mb-1 block text-xs font-semibold text-slate-700">Product</label>
      <input
        value={productName}
        disabled={isLoading}
        onChange={(event) => {
          onNameChange(event.target.value);
          onClear?.();
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Type or search product name..."
        autoComplete="off"
        required
      />
      {isNewProduct ? (
        <p className="mt-1 text-[11px] font-medium text-emerald-700">
          New product — it will be saved automatically for future sales.
        </p>
      ) : productId ? (
        <p className="mt-1 text-[11px] text-slate-500">Existing product selected from catalogue.</p>
      ) : (
        <p className="mt-1 text-[11px] text-slate-500">Start typing to search saved products, or enter a new product name.</p>
      )}

      {open && filteredProducts.length > 0 ? (
        <ul className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {filteredProducts.map((product) => (
            <li key={product.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50"
                onMouseDown={(event) => {
                  event.preventDefault();
                  onSelect(product);
                  setOpen(false);
                }}
              >
                {formatProductLabel(product)}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
