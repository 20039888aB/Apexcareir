import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import DualCurrencyInput from '../../components/apexcareir/DualCurrencyInput';
import ExchangeRateControl from '../../components/apexcareir/ExchangeRateControl';
import AdminConfirmButton from '../../components/apexcareir/AdminConfirmButton';
import { useServerClock } from '../../hooks/useServerClock';
import {
  archiveProduct,
  createBulkStockReceipt,
  createProduct,
  createProductCategory,
  createStockAdjustment,
  createStockTransfer,
  deleteProductCategory,
  deleteStockReceipt,
  deleteStockTransfer,
  ensureProduct,
  forceDeleteProduct,
  listLowStockProducts,
  purgeProductHistory,
  seedMedicalCatalogue,
  listProductCategories,
  seedDefaultProductCategories,
  listProductHistory,
  listProducts,
  listStockAdjustments,
  listStockReceipts,
  listStockTransfers,
  listSuppliers,
  unarchiveProduct,
  updateProduct,
  updateStockReceipt,
  type Product,
} from '../../services';
import { useAuth } from '../../hooks';
import { formatDualCurrency, formatKes, formatUsd, getStoredUsdToKesRate } from '../../utils/currency';

type InventoryTab = 'catalogue' | 'products' | 'receiving' | 'transfers' | 'adjustments' | 'alerts' | 'history';

const tabs: { id: InventoryTab; label: string }[] = [
  { id: 'catalogue', label: 'Catalogue: Ordering & Availability' },
  { id: 'products', label: 'Phase 1-2: Categories & Products' },
  { id: 'receiving', label: 'Receive New Stock' },
  { id: 'transfers', label: 'Phase 4: Stock Movements' },
  { id: 'adjustments', label: 'Phase 5: Stock Adjustments' },
  { id: 'alerts', label: 'Phase 6: Low Stock Alerts' },
  { id: 'history', label: 'Phase 7: Inventory History' },
];

type ReceivingLine = {
  productName: string;
  quantity: string;
  purchase_price: string;
  batch_number: string;
};

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const { hasPermission, isSuperAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<InventoryTab>('catalogue');
  const [catalogueSearch, setCatalogueSearch] = useState('');
  const [catalogueCategoryFilter, setCatalogueCategoryFilter] = useState<string>('');
  const [catalogueAvailabilityFilter, setCatalogueAvailabilityFilter] = useState<string>('all');
  const [catalogueShowArchived, setCatalogueShowArchived] = useState(false);
  const [stockDrafts, setStockDrafts] = useState<Record<number, string>>({});
  const [productSearch, setProductSearch] = useState('');
  const [productStatusFilter, setProductStatusFilter] = useState<string>('');
  const [productCategoryFilter, setProductCategoryFilter] = useState<string>('');
  const [showArchived, setShowArchived] = useState(false);
  const [minimumStockDrafts, setMinimumStockDrafts] = useState<Record<number, string>>({});
  const [editProductId, setEditProductId] = useState<string>('');
  const [historyProductId, setHistoryProductId] = useState<string>('');
  const [receivingLines, setReceivingLines] = useState<ReceivingLine[]>([
    { productName: '', quantity: '', purchase_price: '', batch_number: '' },
  ]);
  const [receivingProductSearchOpen, setReceivingProductSearchOpen] = useState<number | null>(null);
  const [receivingCatalogSearch, setReceivingCatalogSearch] = useState('');
  const [receivingAdditionalExpenses, setReceivingAdditionalExpenses] = useState('');
  const [editingReceiptId, setEditingReceiptId] = useState<number | null>(null);
  const [editReceiptQty, setEditReceiptQty] = useState('');
  const [editReceiptPrice, setEditReceiptPrice] = useState('');
  const [usdToKesRate, setUsdToKesRate] = useState(getStoredUsdToKesRate);
  const [newProductPurchaseKes, setNewProductPurchaseKes] = useState('');
  const [newProductSellingKes, setNewProductSellingKes] = useState('');
  const [editProductPurchaseKes, setEditProductPurchaseKes] = useState('');
  const [editProductSellingKes, setEditProductSellingKes] = useState('');

  const receivingSummary = useMemo(() => {
    const validLines = receivingLines.filter((line) => line.productName.trim() && Number(line.quantity) > 0);
    const totalQuantity = validLines.reduce((sum, line) => sum + Number(line.quantity), 0);
    const goodsTotal = validLines.reduce(
      (sum, line) => sum + Number(line.quantity) * Number(line.purchase_price || 0),
      0,
    );
    const additionalExpenses = Number(receivingAdditionalExpenses || 0);
    const expensePerUnit = totalQuantity > 0 ? additionalExpenses / totalQuantity : 0;
    const grandTotal = goodsTotal + additionalExpenses;

    return {
      lineCount: validLines.length,
      totalQuantity,
      goodsTotal,
      additionalExpenses,
      expensePerUnit,
      grandTotal,
    };
  }, [receivingLines, receivingAdditionalExpenses]);

  const canManageProducts = isSuperAdmin || hasPermission('inventory.product_management');
  const canReceiveStock = isSuperAdmin || hasPermission('inventory.stock_receiving');
  const canTransferStock = isSuperAdmin || hasPermission('inventory.stock_transfers');
  const canAdjustStock = isSuperAdmin || hasPermission('inventory.stock_adjustments');
  const canViewLowStock = isSuperAdmin || hasPermission('inventory.low_stock_alerts');

  const categoriesQuery = useQuery({ queryKey: ['inventory', 'categories'], queryFn: listProductCategories });
  const suppliersQuery = useQuery({ queryKey: ['suppliers', 'inventory'], queryFn: () => listSuppliers() });
  const productsQuery = useQuery({
    queryKey: ['inventory', 'products', productSearch, productStatusFilter, productCategoryFilter, showArchived],
    queryFn: () =>
      listProducts({
        search: productSearch || undefined,
        status: productStatusFilter || undefined,
        category: productCategoryFilter ? Number(productCategoryFilter) : undefined,
        include_archived: showArchived,
      }),
  });
  const catalogueQuery = useQuery({
    queryKey: ['inventory', 'catalogue', catalogueSearch, catalogueCategoryFilter, catalogueShowArchived],
    queryFn: () =>
      listProducts({
        search: catalogueSearch || undefined,
        category: catalogueCategoryFilter ? Number(catalogueCategoryFilter) : undefined,
        include_archived: catalogueShowArchived,
      }),
  });
  const receiptsQuery = useQuery({
    queryKey: ['inventory', 'stock-receipts'],
    queryFn: listStockReceipts,
    enabled: canReceiveStock,
  });
  const receivingProductsQuery = useQuery({
    queryKey: ['inventory', 'receiving-products'],
    queryFn: () => listProducts({ include_archived: false }),
    enabled: canReceiveStock,
  });
  const transfersQuery = useQuery({
    queryKey: ['inventory', 'stock-transfers'],
    queryFn: listStockTransfers,
    enabled: canTransferStock,
  });
  const adjustmentsQuery = useQuery({
    queryKey: ['inventory', 'stock-adjustments'],
    queryFn: listStockAdjustments,
    enabled: canAdjustStock,
  });
  const lowStockQuery = useQuery({
    queryKey: ['inventory', 'low-stock'],
    queryFn: listLowStockProducts,
    enabled: canViewLowStock,
  });
  const historyQuery = useQuery({
    queryKey: ['inventory', 'history', historyProductId],
    queryFn: () => listProductHistory(Number(historyProductId)),
    enabled: Boolean(historyProductId),
  });

  const invalidateInventory = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['inventory'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'overview'] }),
      queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    ]);
  };

  const createCategoryMutation = useMutation({
    mutationFn: createProductCategory,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory', 'categories'] }),
  });
  const seedCategoryMutation = useMutation({
    mutationFn: seedDefaultProductCategories,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory', 'categories'] }),
  });
  const seedCatalogueMutation = useMutation({
    mutationFn: (overwrite: boolean) => seedMedicalCatalogue(overwrite),
    onSuccess: invalidateInventory,
  });
  const forceDeleteProductMutation = useMutation({ mutationFn: forceDeleteProduct, onSuccess: invalidateInventory });
  const purgeHistoryMutation = useMutation({ mutationFn: purgeProductHistory, onSuccess: invalidateInventory });
  const deleteCategoryMutation = useMutation({
    mutationFn: deleteProductCategory,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory', 'categories'] }),
  });
  const createProductMutation = useMutation({ mutationFn: createProduct, onSuccess: invalidateInventory });
  const ensureProductMutation = useMutation({
    mutationFn: ensureProduct,
    onSuccess: invalidateInventory,
  });
  const updateProductMutation = useMutation({
    mutationFn: ({ productId, payload }: { productId: number; payload: Partial<Product> }) => updateProduct(productId, payload),
    onSuccess: invalidateInventory,
  });
  const archiveProductMutation = useMutation({ mutationFn: archiveProduct, onSuccess: invalidateInventory });
  const unarchiveProductMutation = useMutation({ mutationFn: unarchiveProduct, onSuccess: invalidateInventory });
  const createBulkReceiptMutation = useMutation({
    mutationFn: createBulkStockReceipt,
    onSuccess: async () => {
      await invalidateInventory();
      setReceivingLines([{ productName: '', quantity: '', purchase_price: '', batch_number: '' }]);
      setReceivingAdditionalExpenses('');
    },
  });
  const updateStockReceiptMutation = useMutation({
    mutationFn: ({ receiptId, payload }: { receiptId: number; payload: { quantity: number; purchase_price: number } }) =>
      updateStockReceipt(receiptId, payload),
    onSuccess: async () => {
      await invalidateInventory();
      setEditingReceiptId(null);
      setEditReceiptQty('');
      setEditReceiptPrice('');
    },
  });
  const deleteStockReceiptMutation = useMutation({
    mutationFn: deleteStockReceipt,
    onSuccess: invalidateInventory,
  });
  const createStockTransferMutation = useMutation({ mutationFn: createStockTransfer, onSuccess: invalidateInventory });
  const createStockAdjustmentMutation = useMutation({ mutationFn: createStockAdjustment, onSuccess: invalidateInventory });

  const { localDate: today } = useServerClock();
  const categories = categoriesQuery.data ?? [];
  const suppliers = suppliersQuery.data ?? [];
  const products = useMemo(() => {
    const seen = new Set<string>();
    const unique: Product[] = [];
    for (const product of productsQuery.data ?? []) {
      if (product.is_archived) continue;
      const key = product.name.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(product);
    }
    return unique;
  }, [productsQuery.data]);

  useEffect(() => {
    if (!editProductId) {
      setEditProductPurchaseKes('');
      setEditProductSellingKes('');
      return;
    }
    const product = products.find((item) => item.id === Number(editProductId));
    if (product) {
      setEditProductPurchaseKes(product.purchase_price || '');
      setEditProductSellingKes(product.selling_price || '');
    }
  }, [editProductId, products]);

  const catalogueProductsRaw = useMemo(() => {
    const seen = new Set<string>();
    const unique: Product[] = [];
    for (const product of catalogueQuery.data ?? []) {
      if (product.is_archived) continue;
      const key = product.name.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(product);
    }
    return unique;
  }, [catalogueQuery.data]);
  const catalogueProducts = catalogueProductsRaw.filter((product) =>
    catalogueAvailabilityFilter === 'all' ? true : product.availability_status === catalogueAvailabilityFilter,
  );
  const catalogueStats = {
    total: catalogueProductsRaw.length,
    inStock: catalogueProductsRaw.filter((product) => product.availability_status === 'in_stock').length,
    lowStock: catalogueProductsRaw.filter((product) => product.availability_status === 'low_stock').length,
    outOfStock: catalogueProductsRaw.filter((product) => product.availability_status === 'out_of_stock').length,
    unavailable: catalogueProductsRaw.filter((product) => product.availability_status === 'unavailable').length,
  };
  const productOptions = products.map((p) => ({ id: p.id, label: `${p.name} (${p.sku})` }));
  const receivingProducts = useMemo(() => {
    const seen = new Set<string>();
    const unique: Product[] = [];
    for (const product of receivingProductsQuery.data ?? []) {
      if (product.is_archived) continue;
      const key = product.name.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(product);
    }
    return unique;
  }, [receivingProductsQuery.data]);
  const receivingCatalogMatches = useMemo(() => {
    const query = receivingCatalogSearch.trim().toLowerCase();
    if (!query) return receivingProducts.slice(0, 12);
    return receivingProducts
      .filter((product) => {
        const haystack = [
          product.name,
          product.sku,
          product.product_number || '',
          product.barcode || '',
          product.brand || '',
          product.category_name || '',
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(query);
      })
      .slice(0, 20);
  }, [receivingCatalogSearch, receivingProducts]);

  const matchesForReceivingLine = (query: string) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return receivingProducts.slice(0, 8);
    return receivingProducts
      .filter((product) => {
        const haystack = [product.name, product.sku, product.product_number || '', product.barcode || '', product.brand || '']
          .join(' ')
          .toLowerCase();
        return haystack.includes(needle);
      })
      .slice(0, 8);
  };

  const saveTypedProductName = (index: number, rawName: string, purchasePrice?: string) => {
    const name = rawName.trim();
    if (!name) return;
    setReceivingProductSearchOpen(null);
    const existing = receivingProducts.find((item) => item.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      setReceivingLines((rows) =>
        rows.map((row, i) => (i === index ? { ...row, productName: existing.name } : row)),
      );
      return;
    }
    ensureProductMutation.mutate(
      {
        name,
        purchase_price: Number(purchasePrice || 0),
      },
      {
        onSuccess: (product) => {
          setReceivingLines((rows) =>
            rows.map((row, i) => (i === index ? { ...row, productName: product.name } : row)),
          );
        },
      },
    );
  };

  const selectReceivingProduct = (index: number, product: Product) => {
    setReceivingLines((rows) =>
      rows.map((row, i) =>
        i === index
          ? {
              ...row,
              productName: product.name,
              purchase_price: row.purchase_price || product.purchase_price || '',
            }
          : row,
      ),
    );
    setReceivingProductSearchOpen(null);
  };

  const lowStockFromProducts = products.filter((product) => product.current_stock <= product.minimum_stock && !product.is_archived);

  const handleCategorySubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get('name') || '').trim();
    if (!name) return;
    createCategoryMutation.mutate({ name, description: String(formData.get('description') || '').trim() });
    event.currentTarget.reset();
  };

  const handleProductSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    createProductMutation.mutate({
      name: String(formData.get('name') || '').trim(),
      sku: String(formData.get('sku') || '').trim(),
      barcode: String(formData.get('barcode') || '').trim(),
      category: formData.get('category') ? Number(formData.get('category')) : null,
      brand: String(formData.get('brand') || '').trim(),
      model_name: String(formData.get('model_name') || '').trim(),
      supplier: formData.get('supplier') ? Number(formData.get('supplier')) : null,
      unit: String(formData.get('unit') || 'pcs'),
      purchase_price: Number(newProductPurchaseKes || 0),
      selling_price: Number(newProductSellingKes || 0),
      current_stock: Number(formData.get('current_stock') || 0),
      minimum_stock: Number(formData.get('minimum_stock') || 0),
      description: String(formData.get('description') || '').trim(),
      status: String(formData.get('status') || 'active') as Product['status'],
    });
    setNewProductPurchaseKes('');
    setNewProductSellingKes('');
    event.currentTarget.reset();
  };

  const handleStockTransferSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    createStockTransferMutation.mutate({
      product: Number(formData.get('product')),
      quantity: Number(formData.get('quantity') || 0),
      destination: String(formData.get('destination') || '').trim(),
      customer: String(formData.get('customer') || '').trim(),
      selling_price: Number(formData.get('selling_price') || 0),
      date: String(formData.get('date') || today),
      notes: String(formData.get('notes') || '').trim(),
    });
    event.currentTarget.reset();
  };

  const handleStockAdjustmentSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    createStockAdjustmentMutation.mutate({
      product: Number(formData.get('product')),
      reason: String(formData.get('reason')) as 'damaged' | 'lost' | 'expired' | 'correction' | 'returned',
      operation: String(formData.get('operation')) as 'increase' | 'decrease',
      quantity: Number(formData.get('quantity') || 0),
      date: String(formData.get('date') || today),
      notes: String(formData.get('notes') || '').trim(),
    });
    event.currentTarget.reset();
  };

  const renderCatalogueTab = () => (
    <div className="space-y-4">
      <section className="apex-glass-panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Medical Catalogue Master List</h3>
            <p className="text-xs text-slate-500">
              Manage quantity remaining and availability for all items you plan to order.
              {canReceiveStock ? (
                <>
                  {' '}
                  To register new stock arriving from a supplier, open the <strong>Receive New Stock</strong> tab and
                  record the invoice with buying price and shipment expenses.
                </>
              ) : null}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="apex-btn-soft" onClick={() => seedCatalogueMutation.mutate(false)} disabled={seedCatalogueMutation.isPending}>
              {seedCatalogueMutation.isPending ? 'Seeding catalogue...' : 'Seed Standard Catalogue Items'}
            </button>
            {canManageProducts ? (
              <AdminConfirmButton
                label="Overwrite Catalogue"
                confirmMessage="Overwrite existing catalogue items with standard definitions?"
                onConfirm={() => seedCatalogueMutation.mutateAsync(true)}
                disabled={seedCatalogueMutation.isPending}
                variant="soft"
              />
            ) : null}
          </div>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Total Items</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{catalogueStats.total}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-[11px] uppercase tracking-wide text-emerald-700">In Stock</p>
            <p className="mt-1 text-lg font-semibold text-emerald-800">{catalogueStats.inStock}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-[11px] uppercase tracking-wide text-amber-700">Low Stock</p>
            <p className="mt-1 text-lg font-semibold text-amber-800">{catalogueStats.lowStock}</p>
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50 p-3">
            <p className="text-[11px] uppercase tracking-wide text-red-700">Out of Stock</p>
            <p className="mt-1 text-lg font-semibold text-red-800">{catalogueStats.outOfStock}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-100 p-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-600">Unavailable</p>
            <p className="mt-1 text-lg font-semibold text-slate-800">{catalogueStats.unavailable}</p>
          </div>
        </div>
      </section>

      <section className="apex-glass-panel p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          <input
            placeholder="Search catalogue by product, SKU, brand, barcode..."
            className="min-w-[250px]"
            value={catalogueSearch}
            onChange={(event) => setCatalogueSearch(event.target.value)}
          />
          <select value={catalogueCategoryFilter} onChange={(event) => setCatalogueCategoryFilter(event.target.value)}>
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select value={catalogueAvailabilityFilter} onChange={(event) => setCatalogueAvailabilityFilter(event.target.value)}>
            <option value="all">All availability</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock</option>
            <option value="out_of_stock">Out of Stock</option>
            <option value="unavailable">Unavailable</option>
          </select>
          <label className="flex items-center gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={catalogueShowArchived}
              onChange={(event) => setCatalogueShowArchived(event.target.checked)}
            />
            Show archived
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-2">Item</th>
                <th className="py-2 pr-2">SKU</th>
                <th className="py-2 pr-2">Category</th>
                <th className="py-2 pr-2">Brand / Model</th>
                <th className="py-2 pr-2">Quantity Remaining</th>
                <th className="py-2 pr-2">Minimum</th>
                <th className="py-2 pr-2">Availability</th>
                <th className="py-2 pr-2">Quick Update</th>
                {canManageProducts ? <th className="py-2 pr-2">Admin</th> : null}
              </tr>
            </thead>
            <tbody>
              {catalogueProducts.map((product) => {
                const availabilityLabel =
                  product.availability_status === 'in_stock'
                    ? 'In Stock'
                    : product.availability_status === 'low_stock'
                      ? 'Low Stock'
                      : product.availability_status === 'out_of_stock'
                        ? 'Out of Stock'
                        : 'Unavailable';

                const availabilityClass =
                  product.availability_status === 'in_stock'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    : product.availability_status === 'low_stock'
                      ? 'bg-amber-100 text-amber-800 border-amber-200'
                      : product.availability_status === 'out_of_stock'
                        ? 'bg-red-100 text-red-800 border-red-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200';

                return (
                  <tr key={product.id} className="border-b border-slate-100">
                    <td className="py-2 pr-2 font-medium text-slate-800">{product.name}</td>
                    <td className="py-2 pr-2">{product.sku}</td>
                    <td className="py-2 pr-2">{product.category_name || '-'}</td>
                    <td className="py-2 pr-2">
                      {[product.brand, product.model_name].filter(Boolean).join(' / ') || '-'}
                    </td>
                    <td className="py-2 pr-2 font-semibold text-slate-900">{product.current_stock}</td>
                    <td className="py-2 pr-2">{product.minimum_stock}</td>
                    <td className="py-2 pr-2">
                      <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold ${availabilityClass}`}>
                        {availabilityLabel}
                      </span>
                    </td>
                    <td className="py-2 pr-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          className="w-20"
                          value={stockDrafts[product.id] ?? String(product.current_stock)}
                          onChange={(event) => setStockDrafts((current) => ({ ...current, [product.id]: event.target.value }))}
                        />
                        <button
                          className="apex-btn-soft"
                          onClick={() =>
                            updateProductMutation.mutate({
                              productId: product.id,
                              payload: { current_stock: Number(stockDrafts[product.id] ?? product.current_stock) },
                            })
                          }
                        >
                          Save
                        </button>
                      </div>
                    </td>
                    {canManageProducts ? (
                      <td className="py-2 pr-2">
                        <div className="flex flex-wrap gap-1">
                          <AdminConfirmButton
                            label="Delete"
                            confirmMessage={`Permanently delete ${product.name} (${product.sku}) and all related records?`}
                            onConfirm={() => forceDeleteProductMutation.mutateAsync(product.id)}
                            disabled={forceDeleteProductMutation.isPending}
                          />
                          <AdminConfirmButton
                            label="Clear History"
                            confirmMessage={`Clear stock movement history for ${product.name}?`}
                            onConfirm={() => purgeHistoryMutation.mutateAsync(product.id)}
                            disabled={purgeHistoryMutation.isPending}
                            variant="soft"
                          />
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {catalogueProducts.length === 0 && <p className="py-4 text-sm text-slate-500">No catalogue items found for the selected filters.</p>}
        </div>
      </section>
    </div>
  );

  const renderProductsTab = () => (
    <div className="space-y-4">
      {lowStockFromProducts.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Low-stock warning: {lowStockFromProducts.length} product(s) have reached minimum threshold.
        </div>
      )}

      <ExchangeRateControl rate={usdToKesRate} onRateChange={setUsdToKesRate} />

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="apex-glass-panel p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Phase 1: Product Categories</h3>
            <button className="apex-btn-soft" onClick={() => seedCategoryMutation.mutate()}>
              Seed Standard Categories
            </button>
          </div>
          <form className="mt-3 space-y-2" onSubmit={handleCategorySubmit}>
            <input name="name" required placeholder="Category name" className="w-full" />
            <textarea name="description" placeholder="Description" className="w-full" />
            <button disabled={createCategoryMutation.isPending}>Add Category</button>
          </form>
          {canManageProducts && categories.length > 0 ? (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold text-slate-700">Manage Categories</p>
              {categories.map((category) => (
                <div key={category.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-xs">
                  <span>{category.name}</span>
                  <AdminConfirmButton
                    label="Delete"
                    confirmMessage={`Delete category ${category.name}? Products will be unlinked.`}
                    onConfirm={() => deleteCategoryMutation.mutateAsync(category.id)}
                    disabled={deleteCategoryMutation.isPending}
                  />
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <section className="apex-glass-panel p-4">
          <h3 className="text-sm font-semibold text-slate-800">Phase 2: Product Management</h3>
          <form className="mt-3 grid gap-2 sm:grid-cols-2" onSubmit={handleProductSubmit}>
            <input name="name" required placeholder="Product Name" className="sm:col-span-2" />
            <input name="sku" required placeholder="SKU (unique)" />
            <input name="barcode" placeholder="Barcode (optional)" />
            <select name="category">
              <option value="">Category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <select name="supplier">
              <option value="">Supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
            <input name="brand" placeholder="Brand" />
            <input name="model_name" placeholder="Model" />
            <input name="unit" defaultValue="pcs" placeholder="Unit of Measure" />
            <select name="status">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="discontinued">Discontinued</option>
            </select>
            <DualCurrencyInput
              label="Purchase price"
              kesValue={newProductPurchaseKes}
              onKesChange={setNewProductPurchaseKes}
              usdRate={usdToKesRate}
              kesPlaceholder="Purchase price (KSH)"
              usdPlaceholder="Purchase price (USD)"
              required
              compact
              className="sm:col-span-2"
            />
            <DualCurrencyInput
              label="Selling price"
              kesValue={newProductSellingKes}
              onKesChange={setNewProductSellingKes}
              usdRate={usdToKesRate}
              kesPlaceholder="Selling price (KSH)"
              usdPlaceholder="Selling price (USD)"
              required
              compact
              className="sm:col-span-2"
            />
            <input name="current_stock" type="number" min="0" defaultValue="0" placeholder="Current Stock" />
            <input name="minimum_stock" type="number" min="0" defaultValue="0" placeholder="Minimum Stock" />
            <textarea name="description" placeholder="Description" className="sm:col-span-2" />
            <button disabled={createProductMutation.isPending} className="sm:col-span-2">
              Add Product
            </button>
          </form>
        </section>
      </div>

      <section className="apex-glass-panel p-4">
        <h3 className="text-sm font-semibold text-slate-800">Edit Product Details</h3>
        <form
          className="mt-3 grid gap-2 sm:grid-cols-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!editProductId) return;
            const formData = new FormData(event.currentTarget);
            updateProductMutation.mutate({
              productId: Number(editProductId),
              payload: {
                barcode: String(formData.get('barcode') || '').trim(),
                brand: String(formData.get('brand') || '').trim(),
                model_name: String(formData.get('model_name') || '').trim(),
                supplier: formData.get('supplier') ? Number(formData.get('supplier')) : null,
                purchase_price: editProductPurchaseKes,
                selling_price: editProductSellingKes,
                unit: String(formData.get('unit') || 'pcs'),
                status: String(formData.get('status') || 'active') as Product['status'],
                description: String(formData.get('description') || '').trim(),
              },
            });
            event.currentTarget.reset();
          }}
        >
          <select value={editProductId} onChange={(event) => setEditProductId(event.target.value)} className="sm:col-span-3">
            <option value="">Select product to edit</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} ({product.sku})
              </option>
            ))}
          </select>
          <input name="barcode" placeholder="Barcode" />
          <input name="brand" placeholder="Brand" />
          <input name="model_name" placeholder="Model" />
          <select name="supplier">
            <option value="">Supplier</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
          <DualCurrencyInput
            label="Purchase price"
            kesValue={editProductPurchaseKes}
            onKesChange={setEditProductPurchaseKes}
            usdRate={usdToKesRate}
            kesPlaceholder="Purchase price (KSH)"
            usdPlaceholder="Purchase price (USD)"
            compact
            className="sm:col-span-3"
          />
          <DualCurrencyInput
            label="Selling price"
            kesValue={editProductSellingKes}
            onKesChange={setEditProductSellingKes}
            usdRate={usdToKesRate}
            kesPlaceholder="Selling price (KSH)"
            usdPlaceholder="Selling price (USD)"
            compact
            className="sm:col-span-3"
          />
          <input name="unit" placeholder="Unit" />
          <select name="status">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="discontinued">Discontinued</option>
          </select>
          <textarea name="description" placeholder="Description" className="sm:col-span-3" />
          <button className="sm:col-span-3">Save Product Changes</button>
        </form>
      </section>

      <section className="apex-glass-panel p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          <input
            placeholder="Search by product/SKU/barcode/model..."
            className="min-w-[240px]"
            value={productSearch}
            onChange={(event) => setProductSearch(event.target.value)}
          />
          <select value={productStatusFilter} onChange={(event) => setProductStatusFilter(event.target.value)}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="discontinued">Discontinued</option>
          </select>
          <select value={productCategoryFilter} onChange={(event) => setProductCategoryFilter(event.target.value)}>
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-xs text-slate-700">
            <input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} />
            Show archived
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-2">Product</th>
                <th className="py-2 pr-2">SKU</th>
                <th className="py-2 pr-2">Barcode</th>
                <th className="py-2 pr-2">Category</th>
                <th className="py-2 pr-2">Stock</th>
                <th className="py-2 pr-2">Minimum</th>
                <th className="py-2 pr-2">Status</th>
                <th className="py-2 pr-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-b border-slate-100">
                  <td className="py-2 pr-2">{product.name}</td>
                  <td className="py-2 pr-2">{product.sku}</td>
                  <td className="py-2 pr-2">{product.barcode || '-'}</td>
                  <td className="py-2 pr-2">{product.category_name || '-'}</td>
                  <td className={`py-2 pr-2 ${product.is_low_stock ? 'font-semibold text-red-600' : ''}`}>{product.current_stock}</td>
                  <td className="py-2 pr-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        className="w-20"
                        value={minimumStockDrafts[product.id] ?? String(product.minimum_stock)}
                        onChange={(event) => setMinimumStockDrafts((current) => ({ ...current, [product.id]: event.target.value }))}
                      />
                      <button
                        className="apex-btn-soft"
                        onClick={() =>
                          updateProductMutation.mutate({
                            productId: product.id,
                            payload: { minimum_stock: Number(minimumStockDrafts[product.id] ?? product.minimum_stock) },
                          })
                        }
                      >
                        Save
                      </button>
                    </div>
                  </td>
                  <td className="py-2 pr-2 capitalize">{product.is_archived ? 'archived' : product.status}</td>
                  <td className="py-2 pr-2">
                    <div className="flex gap-2">
                      <select
                        defaultValue={product.status}
                        className="apex-btn-soft"
                        onChange={(event) =>
                          updateProductMutation.mutate({
                            productId: product.id,
                            payload: { status: event.target.value as Product['status'] },
                          })
                        }
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="discontinued">Discontinued</option>
                      </select>
                      {!product.is_archived ? (
                        <button className="apex-btn-soft" onClick={() => archiveProductMutation.mutate(product.id)}>
                          Archive
                        </button>
                      ) : (
                        <button className="apex-btn-soft" onClick={() => unarchiveProductMutation.mutate(product.id)}>
                          Restore
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );

  const renderReceivingTab = () => (
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="apex-glass-panel p-4">
        <h3 className="text-sm font-semibold text-slate-800">Register Incoming Stock</h3>
        <p className="mt-1 text-xs text-slate-600">
          Use this form when new inventory arrives. Type a product name (pick an existing one or enter a new name to add
          it to the catalogue), enter the buying price per line, then add shared delivery expenses once for the whole
          shipment.
        </p>
        <form
          className="mt-3 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (createBulkReceiptMutation.isPending) return;
            const formData = new FormData(event.currentTarget);
            const mergedItems = new Map<
              string,
              { product_name: string; quantity: number; purchase_price: number; batch_number: string }
            >();
            for (const line of receivingLines) {
              const productName = line.productName.trim();
              const quantity = Number(line.quantity);
              if (!productName || quantity <= 0) continue;
              const key = productName.toLowerCase();
              const existing = mergedItems.get(key);
              if (existing) {
                existing.quantity += quantity;
                existing.purchase_price = Number(line.purchase_price || existing.purchase_price || 0);
                if (line.batch_number.trim()) existing.batch_number = line.batch_number.trim();
              } else {
                mergedItems.set(key, {
                  product_name: productName,
                  quantity,
                  purchase_price: Number(line.purchase_price || 0),
                  batch_number: line.batch_number.trim(),
                });
              }
            }
            if (mergedItems.size === 0) return;
            createBulkReceiptMutation.mutate({
              supplier: formData.get('supplier') ? Number(formData.get('supplier')) : null,
              invoice_number: String(formData.get('invoice_number') || '').trim(),
              date_received: String(formData.get('date_received') || today),
              additional_expenses: Number(receivingAdditionalExpenses || 0),
              notes: String(formData.get('notes') || '').trim(),
              items: Array.from(mergedItems.values()),
            });
          }}
        >
          <ExchangeRateControl rate={usdToKesRate} onRateChange={setUsdToKesRate} className="mb-1" />
          <div className="grid gap-2 sm:grid-cols-2">
            <input name="invoice_number" required placeholder="Supplier invoice number" />
            <select name="supplier">
              <option value="">Supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
            <input name="date_received" type="date" defaultValue={today} />
            <DualCurrencyInput
              label="Additional expenses (shipping, clearing, transport)"
              kesValue={receivingAdditionalExpenses}
              onKesChange={setReceivingAdditionalExpenses}
              usdRate={usdToKesRate}
              kesPlaceholder="Expenses (KSH)"
              usdPlaceholder="Expenses (USD)"
              compact
            />
            <textarea name="notes" placeholder="Receipt notes" className="sm:col-span-2" />
          </div>

          <div className="rounded-lg border border-sky-200 bg-sky-50/70 p-3">
            <label className="text-xs font-semibold text-sky-900" htmlFor="receiving-catalog-search">
              Search available products in the database
            </label>
            <input
              id="receiving-catalog-search"
              value={receivingCatalogSearch}
              onChange={(event) => setReceivingCatalogSearch(event.target.value)}
              placeholder="Search by name, SKU, barcode, brand…"
              className="mt-2 w-full"
              autoComplete="off"
            />
            <div className="mt-2 max-h-40 overflow-y-auto rounded-md border border-sky-100 bg-white">
              {receivingProductsQuery.isLoading ? (
                <p className="p-2 text-xs text-slate-500">Loading products…</p>
              ) : receivingCatalogMatches.length === 0 ? (
                <p className="p-2 text-xs text-slate-500">
                  {receivingCatalogSearch.trim()
                    ? 'No matching products. Type the new name in a product line below to add it.'
                    : 'Start typing to search the product catalogue.'}
                </p>
              ) : (
                <ul className="divide-y divide-slate-100 text-xs">
                  {receivingCatalogMatches.map((product) => (
                    <li key={product.id}>
                      <button
                        type="button"
                        className="flex w-full items-start justify-between gap-2 px-2 py-2 text-left hover:bg-sky-50"
                        onClick={() => {
                          setReceivingLines((rows) => {
                            const emptyIndex = rows.findIndex((row) => !row.productName.trim());
                            const targetIndex = emptyIndex >= 0 ? emptyIndex : 0;
                            return rows.map((row, i) =>
                              i === targetIndex
                                ? {
                                    ...row,
                                    productName: product.name,
                                    purchase_price: row.purchase_price || product.purchase_price || '',
                                  }
                                : row,
                            );
                          });
                          setReceivingCatalogSearch(product.name);
                        }}
                      >
                        <span>
                          <span className="font-medium text-slate-800">{product.name}</span>
                          <span className="mt-0.5 block text-[11px] text-slate-500">
                            {product.sku}
                            {product.category_name ? ` · ${product.category_name}` : ''}
                          </span>
                        </span>
                        <span className="shrink-0 text-[11px] text-slate-600">
                          Stock: <strong>{product.current_stock}</strong>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-2 text-xs text-slate-600">
            <p className="font-medium text-slate-700">Product lines</p>
            <p className="mt-1">
              Search and select an existing product, or type a new name. New names are saved automatically when you leave
              the field (or press Enter). Buying price = unit cost from the supplier invoice.
            </p>
          </div>

          <div className="space-y-2">
            {receivingLines.map((line, index) => {
              const lineMatches = matchesForReceivingLine(line.productName);
              const showSuggestions = receivingProductSearchOpen === index;
              return (
              <div key={index} className="grid gap-2 rounded-lg border border-slate-200 p-2 sm:grid-cols-2 xl:grid-cols-4">
                <div className="relative sm:col-span-2 xl:col-span-1">
                  <input
                    value={line.productName}
                    onChange={(event) => {
                      const value = event.target.value;
                      setReceivingLines((rows) =>
                        rows.map((row, i) => (i === index ? { ...row, productName: value } : row)),
                      );
                      setReceivingProductSearchOpen(index);
                    }}
                    onFocus={() => setReceivingProductSearchOpen(index)}
                    onBlur={() => {
                      window.setTimeout(() => {
                        setReceivingProductSearchOpen((openIndex) => (openIndex === index ? null : openIndex));
                        saveTypedProductName(index, line.productName, line.purchase_price);
                      }, 150);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        saveTypedProductName(index, line.productName, line.purchase_price);
                      }
                      if (event.key === 'Escape') {
                        setReceivingProductSearchOpen(null);
                      }
                    }}
                    placeholder="Search or type product name"
                    required
                    autoComplete="off"
                    className="w-full"
                  />
                  {showSuggestions && (
                    <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
                      {lineMatches.length === 0 ? (
                        <p className="px-2 py-2 text-[11px] text-slate-500">
                          No match — keep typing a new name to create it.
                        </p>
                      ) : (
                        lineMatches.map((product) => (
                          <button
                            key={product.id}
                            type="button"
                            className="flex w-full items-start justify-between gap-2 px-2 py-2 text-left text-xs hover:bg-emerald-50"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => selectReceivingProduct(index, product)}
                          >
                            <span>
                              <span className="font-medium text-slate-800">{product.name}</span>
                              <span className="mt-0.5 block text-[11px] text-slate-500">{product.sku}</span>
                            </span>
                            <span className="shrink-0 text-[11px] text-slate-600">Qty {product.current_stock}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                  {ensureProductMutation.isPending && (
                    <p className="mt-1 text-[11px] text-slate-500">Saving product…</p>
                  )}
                </div>
                <input
                  type="number"
                  min="1"
                  placeholder="Quantity"
                  value={line.quantity}
                  onChange={(event) =>
                    setReceivingLines((rows) => rows.map((row, i) => (i === index ? { ...row, quantity: event.target.value } : row)))
                  }
                />
                <DualCurrencyInput
                  label="Buying price"
                  kesValue={line.purchase_price}
                  onKesChange={(value) =>
                    setReceivingLines((rows) => rows.map((row, i) => (i === index ? { ...row, purchase_price: value } : row)))
                  }
                  usdRate={usdToKesRate}
                  kesPlaceholder="Buying price (KSH)"
                  usdPlaceholder="Buying price (USD)"
                  compact
                  className="xl:col-span-2"
                />
                <div className="flex gap-2 sm:col-span-2 xl:col-span-4">
                  <input
                    placeholder="Batch no."
                    value={line.batch_number}
                    onChange={(event) =>
                      setReceivingLines((rows) => rows.map((row, i) => (i === index ? { ...row, batch_number: event.target.value } : row)))
                    }
                    className="flex-1"
                  />
                  <button
                    type="button"
                    className="apex-btn-soft"
                    onClick={() => setReceivingLines((rows) => rows.filter((_, i) => i !== index))}
                    disabled={receivingLines.length === 1}
                  >
                    X
                  </button>
                </div>
              </div>
              );
            })}
          </div>

          {receivingSummary.lineCount > 0 && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-900">
              <p>
                Goods total: <strong>{formatKes(receivingSummary.goodsTotal)}</strong> (
                <strong>{formatUsd(receivingSummary.goodsTotal / usdToKesRate)}</strong>) · Additional expenses:{' '}
                <strong>{formatKes(receivingSummary.additionalExpenses)}</strong> (
                <strong>{formatUsd(receivingSummary.additionalExpenses / usdToKesRate)}</strong>) · Grand total:{' '}
                <strong>{formatKes(receivingSummary.grandTotal)}</strong> (
                <strong>{formatUsd(receivingSummary.grandTotal / usdToKesRate)}</strong>)
              </p>
              {receivingSummary.totalQuantity > 0 && receivingSummary.additionalExpenses > 0 && (
                <p className="mt-1">
                  Shared expenses add <strong>{formatKes(receivingSummary.expensePerUnit)}</strong> (
                  <strong>{formatUsd(receivingSummary.expensePerUnit / usdToKesRate)}</strong>) per unit across{' '}
                  {receivingSummary.totalQuantity} items received.
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              className="apex-btn-soft"
              onClick={() => setReceivingLines((rows) => [...rows, { productName: '', quantity: '', purchase_price: '', batch_number: '' }])}
            >
              Add Line
            </button>
            <button type="submit" disabled={createBulkReceiptMutation.isPending}>
              {createBulkReceiptMutation.isPending ? 'Saving…' : 'Save Receiving Transaction'}
            </button>
          </div>
        </form>
      </section>

      <section className="apex-glass-panel p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-800">Recent Receipts</h3>
        <p className="mb-2 text-xs text-slate-500">Edit quantity/price or delete a receipt anytime. Stock updates automatically.</p>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 pr-2">Invoice</th>
                <th className="py-2 pr-2">Supplier</th>
                <th className="py-2 pr-2">Product</th>
                <th className="py-2 pr-2">Qty</th>
                <th className="py-2 pr-2">Buying price (KSH / USD)</th>
                <th className="py-2 pr-2">Shipment expenses (KSH / USD)</th>
                <th className="py-2 pr-2">Received By</th>
                <th className="py-2 pr-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(receiptsQuery.data ?? []).map((receipt) => {
                const isEditing = editingReceiptId === receipt.id;
                return (
                  <tr key={receipt.id} className="border-b border-slate-100 align-top">
                    <td className="py-2 pr-2">{receipt.invoice_number}</td>
                    <td className="py-2 pr-2">{receipt.supplier_name || '-'}</td>
                    <td className="py-2 pr-2">{receipt.product_name}</td>
                    <td className="py-2 pr-2">
                      {isEditing ? (
                        <input
                          type="number"
                          min="1"
                          value={editReceiptQty}
                          onChange={(event) => setEditReceiptQty(event.target.value)}
                          className="w-20"
                        />
                      ) : (
                        receipt.quantity
                      )}
                    </td>
                    <td className="py-2 pr-2">
                      {isEditing ? (
                        <DualCurrencyInput
                          label="Buying price"
                          kesValue={editReceiptPrice}
                          onKesChange={setEditReceiptPrice}
                          usdRate={usdToKesRate}
                          kesPlaceholder="KSH"
                          usdPlaceholder="USD"
                          compact
                        />
                      ) : (
                        formatDualCurrency(receipt.purchase_price, usdToKesRate)
                      )}
                    </td>
                    <td className="py-2 pr-2">{formatDualCurrency(receipt.batch_additional_expenses || '0', usdToKesRate)}</td>
                    <td className="py-2 pr-2">{receipt.received_by_email || '-'}</td>
                    <td className="py-2 pr-2">
                      <div className="flex flex-wrap gap-1">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              className="apex-btn-soft"
                              disabled={updateStockReceiptMutation.isPending || Number(editReceiptQty) <= 0}
                              onClick={() =>
                                updateStockReceiptMutation.mutate({
                                  receiptId: receipt.id,
                                  payload: {
                                    quantity: Number(editReceiptQty),
                                    purchase_price: Number(editReceiptPrice || 0),
                                  },
                                })
                              }
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              className="apex-btn-soft"
                              onClick={() => {
                                setEditingReceiptId(null);
                                setEditReceiptQty('');
                                setEditReceiptPrice('');
                              }}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="apex-btn-soft"
                            onClick={() => {
                              setEditingReceiptId(receipt.id);
                              setEditReceiptQty(String(receipt.quantity));
                              setEditReceiptPrice(String(receipt.purchase_price || '0'));
                            }}
                          >
                            Edit
                          </button>
                        )}
                        <AdminConfirmButton
                          label="Delete"
                          confirmMessage={`Delete receipt for ${receipt.product_name} (qty ${receipt.quantity})? Stock will be reduced.`}
                          disabled={deleteStockReceiptMutation.isPending}
                          onConfirm={() => deleteStockReceiptMutation.mutateAsync(receipt.id)}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );

  const renderTransfersTab = () => (
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="apex-glass-panel p-4">
        <h3 className="text-sm font-semibold text-slate-800">Phase 4: Stock Movements (Sales / Transfers)</h3>
        <form className="mt-3 grid gap-2 sm:grid-cols-2" onSubmit={handleStockTransferSubmit}>
          <select name="product" required className="sm:col-span-2">
            <option value="">Select product</option>
            {productOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          <input name="quantity" type="number" min="1" required placeholder="Quantity" />
          <input name="selling_price" type="number" min="0" step="0.01" required placeholder="Selling price" />
          <input name="destination" required placeholder="Destination" />
          <input name="customer" placeholder="Customer" />
          <input name="date" type="date" defaultValue={today} className="sm:col-span-2" />
          <textarea name="notes" placeholder="Notes" className="sm:col-span-2" />
          <button className="sm:col-span-2">Record Movement</button>
        </form>
      </section>
      <section className="apex-glass-panel p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-800">Recent Stock Movements</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 pr-2">Product</th>
                <th className="py-2 pr-2">Destination</th>
                <th className="py-2 pr-2">Qty</th>
                <th className="py-2 pr-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {(transfersQuery.data ?? []).map((transfer) => (
                <tr key={transfer.id} className="border-b border-slate-100">
                  <td className="py-2 pr-2">{transfer.product_name}</td>
                  <td className="py-2 pr-2">{transfer.destination}</td>
                  <td className="py-2 pr-2 text-red-700">-{transfer.quantity}</td>
                  <td className="py-2 pr-2">{transfer.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );

  const renderAdjustmentsTab = () => (
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="apex-glass-panel p-4">
        <h3 className="text-sm font-semibold text-slate-800">Phase 5: Stock Adjustments</h3>
        <form className="mt-3 grid gap-2 sm:grid-cols-2" onSubmit={handleStockAdjustmentSubmit}>
          <select name="product" required className="sm:col-span-2">
            <option value="">Select product</option>
            {productOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          <select name="reason" required>
            <option value="damaged">Damaged</option>
            <option value="expired">Expired</option>
            <option value="lost">Lost</option>
            <option value="returned">Returned</option>
            <option value="correction">Correction</option>
          </select>
          <select name="operation" required>
            <option value="decrease">Decrease</option>
            <option value="increase">Increase</option>
          </select>
          <input name="quantity" type="number" min="1" required placeholder="Quantity" />
          <input name="date" type="date" defaultValue={today} />
          <textarea name="notes" placeholder="Notes" className="sm:col-span-2" />
          <button className="sm:col-span-2">Record Adjustment</button>
        </form>
      </section>
      <section className="apex-glass-panel p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-800">Adjustment History</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 pr-2">Product</th>
                <th className="py-2 pr-2">Reason</th>
                <th className="py-2 pr-2">Operation</th>
                <th className="py-2 pr-2">Qty</th>
                <th className="py-2 pr-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {(adjustmentsQuery.data ?? []).map((adjustment) => (
                <tr key={adjustment.id} className="border-b border-slate-100">
                  <td className="py-2 pr-2">{adjustment.product_name}</td>
                  <td className="py-2 pr-2 capitalize">{adjustment.reason}</td>
                  <td className="py-2 pr-2 capitalize">{adjustment.operation}</td>
                  <td className="py-2 pr-2">{adjustment.quantity}</td>
                  <td className="py-2 pr-2">{adjustment.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );

  const renderAlertsTab = () => (
    <section className="apex-glass-panel p-4">
      <h3 className="mb-2 text-sm font-semibold text-slate-800">Phase 6: Low Stock Alerts</h3>
      <p className="mb-4 text-sm font-semibold text-red-700">Total alerts: {lowStockQuery.data?.count ?? 0}</p>
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="py-2 pr-2">Product</th>
              <th className="py-2 pr-2">SKU</th>
              <th className="py-2 pr-2">Current</th>
              <th className="py-2 pr-2">Minimum</th>
              <th className="py-2 pr-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {(lowStockQuery.data?.results ?? []).map((product) => (
              <tr key={product.id} className="border-b border-slate-100">
                <td className="py-2 pr-2">{product.name}</td>
                <td className="py-2 pr-2">{product.sku}</td>
                <td className="py-2 pr-2 font-semibold text-red-600">{product.current_stock}</td>
                <td className="py-2 pr-2">{product.minimum_stock}</td>
                <td className="py-2 pr-2 capitalize">{product.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );

  const renderHistoryTab = () => (
    <section className="apex-glass-panel p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-800">Phase 7: Product Inventory Timeline</h3>
      <div className="mb-4 flex flex-wrap gap-2">
        <select value={historyProductId} onChange={(event) => setHistoryProductId(event.target.value)}>
          <option value="">Select a product</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name} ({product.sku})
            </option>
          ))}
        </select>
      </div>
      {historyQuery.data && (
        <div className="space-y-2">
          {historyQuery.data.results.map((movement) => (
            <div key={movement.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <p className="text-xs text-slate-500">{movement.event_date}</p>
              <p className={`text-sm font-semibold ${movement.quantity_change >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {movement.quantity_change >= 0 ? '+' : ''}
                {movement.quantity_change} {movement.movement_type}
              </p>
              <p className="text-xs text-slate-600">{movement.reference_label || movement.note || '-'}</p>
            </div>
          ))}
          {historyQuery.data.results.length === 0 && <p className="text-sm text-slate-500">No movement records for this product yet.</p>}
        </div>
      )}
    </section>
  );

  if (!canManageProducts) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">You do not have inventory product-management permission.</div>;
  }

  return (
    <div className="apexcareir-ui space-y-4">
      <div className="apex-glass-panel p-3">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const isVisible =
              tab.id === 'catalogue' ||
              tab.id === 'products' ||
              tab.id === 'history' ||
              (tab.id === 'receiving' && canReceiveStock) ||
              (tab.id === 'transfers' && canTransferStock) ||
              (tab.id === 'adjustments' && canAdjustStock) ||
              (tab.id === 'alerts' && canViewLowStock);
            if (!isVisible) return null;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`apex-tab ${activeTab === tab.id ? 'apex-tab-active' : 'apex-tab-idle'}`}>
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'catalogue' && renderCatalogueTab()}
      {activeTab === 'products' && renderProductsTab()}
      {activeTab === 'receiving' && canReceiveStock && renderReceivingTab()}
      {activeTab === 'transfers' && canTransferStock && renderTransfersTab()}
      {activeTab === 'adjustments' && canAdjustStock && renderAdjustmentsTab()}
      {activeTab === 'alerts' && canViewLowStock && renderAlertsTab()}
      {activeTab === 'history' && renderHistoryTab()}
    </div>
  );
}
