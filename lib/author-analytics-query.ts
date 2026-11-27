function validDay(value: string): boolean {
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(timestamp) &&
    new Date(timestamp).toISOString().slice(0, 10) === value;
}

export function authorAnalyticsDateQuery(from: string, to: string) {
  if (!validDay(from) || !validDay(to) || from > to) return undefined;
  return { from: `${from}T00:00:00.000Z`, to: `${to}T23:59:59.999Z` };
}
