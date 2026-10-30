export type Item = { product: number; insole: number; qty: number };
export type Order = { items: Item[]; total: number; id: string; createdAt?: string; paymentMethod?: string };
export const itemKey = (item: Item) => `${item.product}:${item.insole}`;

// Preserve baskets saved by the previous single-product version.
export function normalizeCart(value: unknown): Item[] {
  const rows = Array.isArray(value) ? value : value ? [value] : [];
  const items: Item[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const { product, insole, qty } = row as Item;
    if (!Number.isInteger(product) || product < 0 || product > 2 ||
        !Number.isInteger(insole) || insole < 0 || insole > 2 ||
        !Number.isInteger(qty) || qty < 1) continue;
    const existing = items.find(item => itemKey(item) === itemKey(row));
    if (existing) existing.qty = Math.min(99, existing.qty + qty);
    else items.push({ product, insole, qty: Math.min(99, qty) });
  }
  return items;
}

export function addCartItem(items: Item[], incoming: Item): Item[] {
  return normalizeCart([...items, incoming]);
}

export function setItemQuantity(items: Item[], key: string, qty: number): Item[] {
  return items.map(item => itemKey(item) === key
    ? { ...item, qty: Math.max(1, Math.min(99, qty)) } : item);
}

export function removeCartItem(items: Item[], key: string): Item[] {
  return items.filter(item => itemKey(item) !== key);
}

export function cartTotals(items: Item[], products: { price: number }[], insoles: { price: number }[]) {
  const shoes = items.reduce((sum, item) => sum + products[item.product].price * item.qty, 0);
  const extras = items.reduce((sum, item) => sum + insoles[item.insole].price * item.qty, 0);
  return { shoes, extras, total: shoes + extras, quantity: items.reduce((sum, item) => sum + item.qty, 0) };
}

export function normalizeOrder(value: unknown): Order | null {
  if (!value || typeof value !== 'object') return null;
  const old = value as Order & Item;
  const items = normalizeCart(old.items ?? old);
  return items.length && typeof old.id === 'string' && typeof old.total === 'number'
    ? { items, id: old.id, total: old.total,
        ...(typeof old.createdAt==='string'?{createdAt:old.createdAt}:{}),
        ...(typeof old.paymentMethod==='string'?{paymentMethod:old.paymentMethod}:{}) } : null;
}

export function normalizeOrders(value: unknown): Order[] {
  return (Array.isArray(value)?value:[]).map(normalizeOrder).filter((order):order is Order=>order!==null);
}
