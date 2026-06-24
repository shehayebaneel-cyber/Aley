/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/* Google Maps JS API loaded at runtime via <script>. */
/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    google?: any;
  }
  // eslint-disable-next-line no-var
  var google: any;
}
export {};
