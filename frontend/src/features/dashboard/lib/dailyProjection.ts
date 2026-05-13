import type {
  DailySpendingChartPoint,
  DailySpendingPoint,
  UpcomingFixed,
} from '../../../types/api';

export interface DailyProjectionInput {
  reference: Date;
  daysInMonth: number;
  isCurrentMonth: boolean;
  daysPassed: number;
  daily: DailySpendingPoint[];
  upcomingFixed: UpcomingFixed[];
  locale: string;
}

export function buildDailyProjection({
  reference,
  daysInMonth,
  isCurrentMonth,
  daysPassed,
  daily,
  upcomingFixed,
  locale,
}: DailyProjectionInput): DailySpendingChartPoint[] {
  const fixedByDay = new Map<number, number>();
  for (const f of upcomingFixed) {
    fixedByDay.set(f.day, (fixedByDay.get(f.day) ?? 0) + Number(f.amount || 0));
  }

  let projectedVariableDaily = 0;
  let projectionUnstable = true;
  if (isCurrentMonth && daysPassed > 1) {
    const completedDays = daysPassed - 1;
    const totalVariableThroughYesterday = daily
      .filter((d) => {
        const dt = new Date(d.date + 'T00:00:00Z');
        const dayNum = dt.getUTCDate();
        return (
          dt.getUTCMonth() === reference.getMonth() &&
          dt.getUTCFullYear() === reference.getFullYear() &&
          dayNum < daysPassed
        );
      })
      .reduce(
        (acc, d) => acc + (Number(d.variableAmount ?? d.amount) || 0),
        0,
      );
    projectedVariableDaily = totalVariableThroughYesterday / completedDays;
    projectionUnstable = completedDays < 7;
  }

  return Array.from({ length: daysInMonth }, (_, i) => {
    const dayNum = i + 1;
    const isFuture = isCurrentMonth && dayNum > daysPassed;
    const isToday = isCurrentMonth && dayNum === daysPassed;
    const date = new Date(
      Date.UTC(reference.getFullYear(), reference.getMonth(), dayNum),
    );
    const dateStr = date.toISOString().split('T')[0];
    const found = daily.find((d) => d.date === dateStr);
    const totalAmount = found ? Number(found.amount) || 0 : 0;
    const variableAmount = found
      ? Number(found.variableAmount ?? found.amount) || 0
      : 0;
    const fixedAmount = Math.max(0, totalAmount - variableAmount);

    let label = date
      .toLocaleDateString(locale, {
        day: '2-digit',
        weekday: 'short',
        timeZone: 'UTC',
      })
      .replace('.', '');
    label = label.charAt(0).toUpperCase() + label.slice(1);

    if (isFuture) {
      const projectedFixed = fixedByDay.get(dayNum) ?? 0;
      const projectedVariable = projectionUnstable ? 0 : projectedVariableDaily;
      return {
        date: dateStr,
        label,
        actualVariable: null,
        actualFixed: null,
        projectedVariable,
        projectedFixed,
        isFuture: true,
        isToday: false,
      };
    }
    return {
      date: dateStr,
      label,
      actualVariable: variableAmount,
      actualFixed: fixedAmount,
      projectedVariable: null,
      projectedFixed: null,
      isFuture: false,
      isToday,
    };
  });
}
