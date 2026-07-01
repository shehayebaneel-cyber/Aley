import { useEffect } from "react";

const SUFFIX = "Aley — discover Lebanon";

/** Set the document <title>. Pass a page name; falls back to the brand line. */
export function useTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · Aley` : SUFFIX;
    return () => { document.title = SUFFIX; };
  }, [title]);
}
