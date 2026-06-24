export const GOOGLE_MAPS_KEY: string = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "";
export const hasMapsKey = () => GOOGLE_MAPS_KEY.length > 0;

let loadPromise: Promise<any> | null = null;

export function loadGoogleMaps(): Promise<any> {
  if (!hasMapsKey()) return Promise.reject(new Error("No Google Maps API key configured."));
  if (typeof window !== "undefined" && window.google?.maps) return Promise.resolve(window.google.maps);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}`;
    script.async = true;
    script.defer = true;
    script.onload = () => (window.google?.maps ? resolve(window.google.maps) : reject(new Error("Maps failed to load.")));
    script.onerror = () => {
      loadPromise = null;
      reject(new Error("Maps failed to load."));
    };
    document.head.appendChild(script);
  });
  return loadPromise;
}

export const mapsLinkFromCoords = (lat: number, lng: number) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
export const mapsLinkFromText = (text: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(text)}`;
