export const ORDER_SIZES = ["44", "46", "48", "50", "52", "54", "56", "58", "60"] as const;

export const MAX_ORDER_QUANTITY = 2000;

export type OrderSize = (typeof ORDER_SIZES)[number];
export type OrderSizeBreakdown = Record<OrderSize, number>;

export function emptySizeBreakdown(): OrderSizeBreakdown {
  return {
    "44": 0,
    "46": 0,
    "48": 0,
    "50": 0,
    "52": 0,
    "54": 0,
    "56": 0,
    "58": 0,
    "60": 0,
  };
}

export function formatSizeBreakdown(breakdown: Partial<OrderSizeBreakdown> | null | undefined) {
  return ORDER_SIZES
    .filter((size) => Number.isSafeInteger(breakdown?.[size]) && (breakdown?.[size] ?? 0) > 0)
    .map((size) => `${size} × ${breakdown?.[size]}`)
    .join(" · ");
}
