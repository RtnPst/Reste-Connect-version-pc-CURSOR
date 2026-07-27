/**
 * Public brand + support constants for Tu Captes.
 * Domain cutover: set VITE_PUBLIC_APP_URL to https://tucaptes.fr when DNS is live.
 */

export const SUPPORT_EMAIL = "npaysant@gmail.com";
export const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}`;
export const SUPPORT_SLA = "48–72 h";

export const BRAND_NAME = "Tu Captes ?";
export const BRAND_TAGLINE = "Le fil culturel français — capte les mots du web vivant.";

/** Canonical public origin (no trailing slash). */
export function getPublicAppOrigin(): string {
  const fromEnv = String(import.meta.env.VITE_PUBLIC_APP_URL ?? "")
    .trim()
    .replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "https://tucaptes.fr";
}

export const SUPPORT_SUBJECT_PREFIX = "[Tu Captes]";
