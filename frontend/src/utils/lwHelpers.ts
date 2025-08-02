// utils/lwHelpers.ts
import { BusinessDay, Time } from 'lightweight-charts';

/** Accepts "YYYYMMDD" or "YYYYMM" and returns a Lightweight-Charts Time value */
export function parsePerfDate(raw: string): Time {
  if (raw.length === 8) {
    // daily point
    return {
      year: +raw.slice(0, 4),
      month: +raw.slice(4, 6) as BusinessDay['month'],
      day: +raw.slice(6, 8) as BusinessDay['day'],
    };
  }
  // monthly point → take the first of the month
  return {
    year: +raw.slice(0, 4),
    month: +raw.slice(4, 6) as BusinessDay['month'],
    day: 1,
  };
}

/** Zips two parallel arrays into ChartDataPoint[] */
export function toSeries(
  dates: string[],
  values: number[],
): { time: Time; value: number }[] {
  return dates.map((d, i) => ({ time: parsePerfDate(d), value: values[i] }));
}
