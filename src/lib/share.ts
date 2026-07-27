/**
 * Soft share helpers — Web Share API with clipboard fallback.
 */

import { BRAND_NAME, getPublicAppOrigin } from "@/lib/brand";

export type SharePayload = {
  title: string;
  text: string;
  url?: string;
};

export async function sharePayload(payload: SharePayload): Promise<"shared" | "copied" | "cancelled"> {
  const url = payload.url ?? getPublicAppOrigin();

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({
        title: payload.title,
        text: payload.text,
        url,
      });
      return "shared";
    } catch (err) {
      // User dismissed sheet
      if (err && typeof err === "object" && "name" in err && (err as { name: string }).name === "AbortError") {
        return "cancelled";
      }
    }
  }

  try {
    const line = `${payload.text}\n${url}`.trim();
    await navigator.clipboard.writeText(line);
    return "copied";
  } catch {
    return "cancelled";
  }
}

/** Viral-soft line after capturing a named concept. */
export async function shareCapturedConcept(label: string, opts?: { url?: string }) {
  return sharePayload({
    title: BRAND_NAME,
    text: `Tu as capté : ${label} — sur ${BRAND_NAME}`,
    url: opts?.url,
  });
}
