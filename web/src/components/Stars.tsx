import { StarIcon } from "./icons";

export function Stars({ rating, className = "h-4 w-4" }: { rating: number; className?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon key={i} className={`${className} ${i <= Math.round(rating) ? "text-amber-400" : "text-border"}`} />
      ))}
    </span>
  );
}
