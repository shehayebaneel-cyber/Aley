import { useGarage, type Vehicle } from "../lib/useGarage";

const sameCar = (a: Vehicle, b: Vehicle) => a.make === b.make && a.model === b.model && a.year === b.year && a.plate === b.plate;
const carLabel = (c: Vehicle, i: number) => [c.make, c.model, c.year].filter(Boolean).join(" ") || `Car ${i + 1}`;

/** Saved-cars selector: tap a saved car to autofill, or save the current one. */
export function CarPicker({ value, onSelect }: { value: Vehicle; onSelect: (v: Vehicle) => void }) {
  const { cars, add, remove } = useGarage();
  const canSave = !!value.make && !cars.some((c) => sameCar(c, value));
  if (!cars.length && !canSave) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {cars.length > 0 && <span className="text-[11px] font-semibold text-muted">My cars:</span>}
      {cars.map((c, i) => (
        <span key={c.id ?? i} className="inline-flex items-center gap-1 rounded-full border border-border bg-surface pl-3 pr-1.5 py-1 text-xs font-semibold">
          <button type="button" onClick={() => onSelect(c)} className="text-ink hover:text-brand">🚗 {carLabel(c, i)}</button>
          <button type="button" onClick={() => remove(c, i)} aria-label="Remove car" className="flex h-4 w-4 items-center justify-center rounded-full text-muted hover:bg-red-500/10 hover:text-red-500">×</button>
        </span>
      ))}
      {canSave && <button type="button" onClick={() => add(value)} className="rounded-full border border-dashed border-brand/50 px-3 py-1 text-xs font-semibold text-brand hover:bg-brand-soft">💾 Save this car</button>}
    </div>
  );
}
