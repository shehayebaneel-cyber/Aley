import { SparePartsPanel } from "../components/SparePartsPanel";
import { useTitle } from "../lib/useTitle";

export function SpareParts() {
  useTitle("Spare Parts");
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <SparePartsPanel gridCols="sm:grid-cols-2 lg:grid-cols-3" />
    </div>
  );
}
