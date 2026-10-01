export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function expertDue(amount: number, commissionPercent: number): number {
  return roundMoney((amount * commissionPercent) / 100);
}

export function formatMoney(value: number): string {
  const n = roundMoney(value);
  const formatted = new Intl.NumberFormat("ar-LY", {
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n);
  return `${formatted} د.ل`;
}
