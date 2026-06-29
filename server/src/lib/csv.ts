// Minimal CSV builder. Escapes quotes/commas/newlines; opens cleanly in Excel.
export function toCsv(headers: (string | number)[], rows: (string | number | null | undefined)[][]): string {
  const esc = (v: string | number | null | undefined) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))];
  return "﻿" + lines.join("\r\n"); // BOM so Excel reads UTF-8
}
