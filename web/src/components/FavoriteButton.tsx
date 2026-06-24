import { useUserAuth } from "../context/UserAuthContext";
import { HeartIcon } from "./icons";

/** Heart toggle. Prompts login when a guest tries to save. */
export function FavoriteButton({ businessId, className = "" }: { businessId: number; className?: string }) {
  const { isFavorite, toggleFavorite } = useUserAuth();
  const saved = isFavorite(businessId);
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(businessId);
      }}
      aria-label={saved ? "Remove from saved" : "Save"}
      aria-pressed={saved}
      className={`btn flex h-9 w-9 items-center justify-center !p-0 backdrop-blur transition ${
        saved ? "bg-rose-500 text-white" : "bg-white/85 text-ink hover:bg-white"
      } ${className}`}
    >
      <HeartIcon filled={saved} className="h-5 w-5" />
    </button>
  );
}
