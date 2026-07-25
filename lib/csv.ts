export function protectSpreadsheetFormula(value: string): string {
  return /^[=+\-@]/.test(value.trimStart()) ? `'${value}` : value;
}

export function escapeCsvCell(value: unknown): string {
  const normalized =
    value === null || value === undefined
      ? ""
      : protectSpreadsheetFormula(String(value));
  return `"${normalized.replace(/"/g, '""')}"`;
}

export function rowsToCsv(
  columns: readonly string[],
  rows: ReadonlyArray<ReadonlyArray<unknown>>,
): string {
  const header = columns.map(escapeCsvCell).join(",");
  const body = rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
  return `\uFEFF${header}${body ? `\r\n${body}` : ""}\r\n`;
}
