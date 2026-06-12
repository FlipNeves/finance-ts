export interface MonthRange {
  startISO: string;
  endISO: string;
  start: Date;
  end: Date;
  daysInMonth: number;
  isCurrentMonth: boolean;
  daysPassed: number;
  month: number;
  year: number;
}

export function getMonthRange(reference: Date, now: Date = new Date()): MonthRange {
  const year = reference.getFullYear();
  const month = reference.getMonth();

  // UTC boundaries: transactions are stored as date-only values pinned to
  // UTC midnight, so local-time boundaries would clip the first/last day.
  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
  const daysInMonth = end.getUTCDate();
  const isCurrentMonth = now.getMonth() === month && now.getFullYear() === year;
  const daysPassed = isCurrentMonth ? now.getDate() : daysInMonth;

  return {
    startISO: start.toISOString(),
    endISO: end.toISOString(),
    start,
    end,
    daysInMonth,
    isCurrentMonth,
    daysPassed,
    month: month + 1,
    year,
  };
}
