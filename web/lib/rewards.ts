export const POINTS_PER_TAKA = 10;

export const MIN_RECHARGE_TAKA = 20;

export function calculatePointsForRecharge(amountTaka: number): number {
  return amountTaka * POINTS_PER_TAKA;
}
