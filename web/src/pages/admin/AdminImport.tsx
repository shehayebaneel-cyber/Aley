import { useState } from "react";
import { adminApi } from "../../lib/api";

type Row = Record<string, string>;
interface Result { created: number; duplicates: number; unknownCategories: number; byCategory: Record<string, number>; total: number; dryRun: boolean }

// Minimal CSV parser (handles quoted fields, commas, escaped quotes).
function parseCsv(text: string): Row[] {
  const rows: string[][] = [];
  let field = "", row: string[] = [], inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; if (field !== "" || row.length) { row.push(field); rows.push(row); row = []; field = ""; } }
    else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  if (!rows.length) return [];
  const headers = rows[0].map((h) => h.replace(/^﻿/, "").trim().toLowerCase());
  return rows.slice(1).filter((r) => r.some((c) => c.trim())).map((r) => Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? "").trim()])));
}

export function AdminImport() {
  const [rows, setRows] = useState<Row[]>([]);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<Result | null>(null);
  const [done, setDone] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function onFile(file: File | undefined) {
    if (!file) return;
    setErr(""); setPreview(null); setDone(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseCsv(String(reader.result));
        if (!parsed.length || !("name" in parsed[0]) || !("category" in parsed[0])) { setErr("CSV must have at least 'name' and 'category' columns."); return; }
        setRows(parsed); setFileName(file.name);
      } catch { setErr("Couldn't read that file."); }
    };
    reader.readAsText(file);
  }

  async function run(dryRun: boolean) {
    setBusy(true); setErr("");
    try {
      const r = await adminApi.post<Result>("/api/admin/businesses/import", { rows, dryRun });
      if (dryRun) setPreview(r); else { setDone(r); setRows([]); setFileName(""); }
    } catch (e) { setErr(e instanceof Error ? e.message : "Import failed."); }
    finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-extrabold text-ink">Import businesses</h1>
      <p className="mt-1 text-sm text-muted">Upload a CSV (e.g. from <span className="font-mono">npm run fetch:aley</span>) to bulk-add listings. Columns: <span className="font-mono">name, category, phone, address, lat, lng, website</span>. Duplicates (same name) and unknown categories are skipped automatically.</p>

      <div className="card mt-5 p-6">
        <label className="block">
          <span className="text-sm font-semibold text-ink">CSV file</span>
          <input type="file" accept=".csv,text/csv" onChange={(e) => onFile(e.target.files?.[0])} className="mt-2 block w-full text-sm" />
        </label>
        {fileName && <p className="mt-2 text-sm text-muted">Loaded <span className="font-semibold text-ink">{rows.length}</span> rows from {fileName}.</p>}
        {err && <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm font-medium text-red-500">{err}</p>}

        {rows.length > 0 && !done && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => run(true)} disabled={busy} className="btn btn-ghost px-5 py-2.5 disabled:opacity-60">{busy ? "…" : "Preview"}</button>
            <button onClick={() => run(false)} disabled={busy} className="btn btn-primary px-5 py-2.5 disabled:opacity-60">{busy ? "Importing…" : `Import ${rows.length} rows`}</button>
          </div>
        )}

        {preview && !done && (
          <div className="mt-4 rounded-xl surface-2 p-4 text-sm">
            <p className="font-semibold text-ink">Preview</p>
            <p className="mt-1 text-muted">Will create <span className="font-bold text-emerald-600">{preview.created}</span> · skip <span className="font-bold text-amber-600">{preview.duplicates}</span> duplicates · <span className="font-bold text-red-500">{preview.unknownCategories}</span> unknown categories.</p>
            <div className="mt-2 flex flex-wrap gap-1.5">{Object.entries(preview.byCategory).sort((a, b) => b[1] - a[1]).slice(0, 24).map(([c, n]) => <span key={c} className="chip !text-xs">{c}: {n}</span>)}</div>
          </div>
        )}
      </div>

      {/* Sample of loaded rows */}
      {rows.length > 0 && !done && (
        <div className="card mt-4 overflow-x-auto p-4">
          <table className="w-full text-left text-xs">
            <thead><tr className="text-muted">{["name", "category", "phone", "address"].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead>
            <tbody>{rows.slice(0, 12).map((r, i) => <tr key={i} className="border-t border-border"><td className="px-2 py-1 font-semibold text-ink">{r.name}</td><td className="px-2 py-1 text-muted">{r.category}</td><td className="px-2 py-1 text-muted">{r.phone}</td><td className="px-2 py-1 text-muted">{r.address}</td></tr>)}</tbody>
          </table>
          {rows.length > 12 && <p className="mt-2 text-xs text-muted">…and {rows.length - 12} more.</p>}
        </div>
      )}

      {done && (
        <div className="card mt-4 p-6 text-center">
          <p className="font-display text-lg font-bold text-emerald-600">✅ Imported {done.created} businesses</p>
          <p className="mt-1 text-sm text-muted">Skipped {done.duplicates} duplicates and {done.unknownCategories} uncategorized rows. They're live on Explore & the Map now — owners can claim them.</p>
        </div>
      )}
    </div>
  );
}
