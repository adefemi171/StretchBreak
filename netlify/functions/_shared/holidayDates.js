/** Local calendar date as YYYY-MM-DD (avoids UTC timezone shifts). */
export const localDateString = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Keep holidays on/after today, sorted ascending.
 * Falls back to all holidays (sorted) if none remain in the current year.
 */
export const upcomingHolidays = (holidays, { limit = 20, today = localDateString() } = {}) => {
  const list = Array.isArray(holidays) ? holidays : [];
  const normalized = list
    .map((h) => ({
      ...h,
      date: String(h?.date || '').slice(0, 10),
      localName: h?.localName || h?.name || 'Holiday',
    }))
    .filter((h) => /^\d{4}-\d{2}-\d{2}$/.test(h.date))
    .sort((a, b) => a.date.localeCompare(b.date));

  const future = normalized.filter((h) => h.date >= today);
  const source = future.length > 0 ? future : normalized;
  return source.slice(0, limit);
};
