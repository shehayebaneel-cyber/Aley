/** Clean fallback artwork shown when a menu item has no photo. */
export function ProductPlaceholder({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center bg-gradient-to-br from-brand-soft to-surface-2 ${className}`}>
      <svg viewBox="0 0 24 24" fill="none" className="h-1/3 w-1/3 max-h-12 max-w-12 text-brand/40" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 18h18M5 18l1-7c.2-1.4 1.4-2.5 2.9-2.5h6.2c1.5 0 2.7 1.1 2.9 2.5l1 7" />
        <path d="M12 5.5V3M9 5.5h6" />
      </svg>
    </div>
  );
}
