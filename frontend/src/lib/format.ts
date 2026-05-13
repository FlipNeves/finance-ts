export const formatBRL = (value: number | null | undefined): string => {
  const n = Number(value ?? 0);
  return n.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const formatBRLCompact = (value: number | null | undefined): string => {
  const n = Number(value ?? 0);
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
};

export const formatDate = (
  date: string | Date,
  locale: string,
  options: Intl.DateTimeFormatOptions = {},
): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(locale, options);
};
