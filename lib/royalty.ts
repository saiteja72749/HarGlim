/**
 * Royalty per copy = MRP − printing cost − platform charges − delivery charges.
 *
 * The backend still accrues royalty as `salePrice × royaltyPercentage / 100` (snapshotted on
 * each order line), so the admin book forms send the percentage that makes that product equal
 * the per-copy amount at MRP, alongside the cost fields themselves.
 */
export type RoyaltyCosts = {
  printingCost: number;
  platformCharges: number;
  deliveryCharges: number;
};

export const COST_FIELDS: { key: keyof RoyaltyCosts; label: string }[] = [
  { key: "printingCost", label: "Printing cost" },
  { key: "platformCharges", label: "Platform charges" },
  { key: "deliveryCharges", label: "Delivery charges" },
];

const toAmount = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export const readCosts = (source: Partial<Record<keyof RoyaltyCosts, unknown>> | null | undefined): RoyaltyCosts => ({
  printingCost: toAmount(source?.printingCost),
  platformCharges: toAmount(source?.platformCharges),
  deliveryCharges: toAmount(source?.deliveryCharges),
});

export const totalCosts = (costs: RoyaltyCosts) => costs.printingCost + costs.platformCharges + costs.deliveryCharges;

/** True once a book has any cost stored, i.e. its royalty follows the MRP − costs rule. */
export const hasCosts = (costs: RoyaltyCosts) => totalCosts(costs) > 0;

const round2 = (n: number) => Math.round(n * 100) / 100;

export const royaltyPerCopy = (mrp: unknown, costs: RoyaltyCosts) => round2(Math.max(0, toAmount(mrp) - totalCosts(costs)));

/** Percentage of MRP the backend needs so its percentage math yields `royaltyPerCopy`. */
export const royaltyPercentFromCosts = (mrp: unknown, costs: RoyaltyCosts) => {
  const price = toAmount(mrp);
  if (price === 0) return 0;
  return Math.min(100, round2((royaltyPerCopy(price, costs) / price) * 100));
};

/**
 * Per-copy royalty for display: the backend's royaltyPerCopy when it sends one, else MRP − stored
 * costs, else the stored percentage.
 */
export const bookRoyaltyPerCopy = (book: any): number | null => {
  if (typeof book?.royaltyPerCopy === "number") return round2(book.royaltyPerCopy);
  const mrp = book?.mrp ?? book?.price;
  const costs = readCosts(book);
  if (hasCosts(costs)) return royaltyPerCopy(mrp, costs);
  const pct = book?.royaltyPercentage;
  return typeof pct === "number" ? round2((toAmount(mrp) * pct) / 100) : null;
};
