/** Quote CSV cells and neutralize spreadsheet formula injection in untrusted text. */
export function csvCell(value: unknown): string {
  let text = String(value ?? '');
  if (typeof value !== 'number' && (/^[\s\uFEFF]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text))) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
