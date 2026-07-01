import { useEffect, useState } from "react";
import QR from "qrcode";

/** Renders `value` as a QR code image (data URL generated client-side). */
export function QRCode({ value, size = 160, className = "" }: { value: string; size?: number; className?: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let alive = true;
    QR.toDataURL(value, { width: size, margin: 1 }).then((url) => alive && setSrc(url)).catch(() => alive && setSrc(""));
    return () => { alive = false; };
  }, [value, size]);
  if (!src) return <div className="animate-pulse rounded-lg bg-surface-2" style={{ width: size, height: size }} />;
  return <img src={src} alt="QR code" width={size} height={size} className={`rounded-lg bg-white p-1 ${className}`} />;
}

/** Builds the check-in URL a business scans to mark the customer arrived. */
export const checkInUrl = (code: string) => `${window.location.origin}/owner/checkin?code=${encodeURIComponent(code)}`;

/** Builds the voucher-redeem URL a business scans to redeem a gift voucher. */
export const redeemUrl = (code: string) => `${window.location.origin}/owner/redeem?code=${encodeURIComponent(code)}`;

/** Builds the offer-redeem URL a business scans to redeem a claimed offer. */
export const redeemOfferUrl = (code: string) => `${window.location.origin}/owner/redeem-offer?code=${encodeURIComponent(code)}`;
