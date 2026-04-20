/**
 * Calculate accrued PTO days based on annual allowance, start date, and a reference date.
 * Accrual resets each calendar year. Monthly rate = annualAllowance / 12.
 * Accrues for each month that has begun in the current calendar year.
 * If startDate is later in the current year, accrual begins that month instead of January.
 * Result is rounded to 2 decimals and capped at annualAllowance.
 */
export function calculateAccrued(annualAllowance: number, startDate: Date | null, now: Date = new Date()): number {
  if (annualAllowance <= 0) return 0;
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11

  let startMonth = 0; // January
  if (startDate) {
    const sd = new Date(startDate);
    if (sd.getFullYear() > currentYear) return 0; // hasn't started yet
    if (sd.getFullYear() === currentYear) startMonth = sd.getMonth();
  }

  const monthsElapsed = currentMonth - startMonth + 1; // include current month
  if (monthsElapsed <= 0) return 0;

  const accrued = (annualAllowance / 12) * monthsElapsed;
  return Math.min(Math.round(accrued * 100) / 100, annualAllowance);
}
