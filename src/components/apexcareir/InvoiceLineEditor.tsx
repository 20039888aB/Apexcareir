import { useMemo } from 'react';
import type { Product } from '../../services';

export type InvoiceLineForm = {
  id: string;
  product: string;
  quantity: string;
  unit_price: string;
  cost_price: string;
  discount: string;
};

type InvoiceLineEditorProps = {
  lines: InvoiceLineForm[];
  products: Product[];
  onChange: (lines: InvoiceLineForm[]) => void;
};

function createEmptyLine(): InvoiceLineForm {
  return {
    id: crypto.randomUUID(),
    product: '',
    quantity: '1',
    unit_price: '',
    cost_price: '',
    discount: '0',
  };
}

function parseAmount(value: string | number, fallback = 0) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function createInitialInvoiceLines(): InvoiceLineForm[] {
  return [createEmptyLine()];
}

export function calculateLinesTotal(lines: InvoiceLineForm[]) {
  return lines.reduce((total, line) => {
    const subtotal = parseAmount(line.quantity, 1) * parseAmount(line.unit_price);
    return total + subtotal - parseAmount(line.discount);
  }, 0);
}

export default function InvoiceLineEditor({ lines, products, onChange }: InvoiceLineEditorProps) {
  const lineTotal = useMemo(() => calculateLinesTotal(lines), [lines]);

  const updateLine = (lineId: string, patch: Partial<InvoiceLineForm>) => {
    onChange(lines.map((line) => (line.id === lineId ? { ...line, ...patch } : line)));
  };

  const handleProductChange = (lineId: string, productId: string) => {
    const product = products.find((item) => item.id === Number(productId));
    updateLine(lineId, {
      product: productId,
      unit_price: product?.selling_price ?? '',
      cost_price: product?.purchase_price ?? '',
    });
  };

  return (
    <div className="sm:col-span-2 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-semibold text-slate-700">Invoice Line Items</label>
        <button
          type="button"
          className="apex-btn-soft !px-2 !py-1 text-[10px]"
          onClick={() => onChange([...lines, createEmptyLine()])}
        >
          + Add Product Line
        </button>
      </div>

      {lines.map((line, index) => (
        <div key={line.id} className="rounded-lg border border-slate-200 bg-white/80 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-700">Line {index + 1}</p>
            {lines.length > 1 ? (
              <button
                type="button"
                className="text-[10px] text-red-600 hover:underline"
                onClick={() => onChange(lines.filter((entry) => entry.id !== line.id))}
              >
                Remove
              </button>
            ) : null}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <select value={line.product} onChange={(event) => handleProductChange(line.id, event.target.value)} required>
                <option value="">Select product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.sku}) - Stock: {product.current_stock}
                  </option>
                ))}
              </select>
            </div>
            <input
              type="number"
              min="1"
              step="1"
              value={line.quantity}
              onChange={(event) => updateLine(line.id, { quantity: event.target.value })}
              placeholder="Qty"
              required
            />
            <input
              type="number"
              min="0"
              step="0.01"
              value={line.unit_price}
              onChange={(event) => updateLine(line.id, { unit_price: event.target.value })}
              placeholder="Unit price"
              required
            />
            <input
              type="number"
              min="0"
              step="0.01"
              value={line.discount}
              onChange={(event) => updateLine(line.id, { discount: event.target.value })}
              placeholder="Discount"
            />
          </div>
        </div>
      ))}

      <p className="text-[11px] text-slate-500">
        Multi-product invoices are supported. Line total preview:{' '}
        <span className="font-semibold text-slate-800">
          {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(lineTotal)}
        </span>
      </p>
    </div>
  );
}
