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

  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
  const daysInMonth = end.getDate();
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
