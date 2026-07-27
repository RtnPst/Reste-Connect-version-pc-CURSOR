/**
 * Lightweight reminder helper using Notifications API.
 * Shows a daily reminder when the user opens the app on a new Paris day,
 * if they have enabled the reminder. Deep-links toward the fil du jour when possible.
 *
 * Intentionally local-only (no Web Push / VAPID / FCM). Server push is deferred:
 * needs subscription storage, keys, and a cron — not required for Play soft-launch.
 */

import { parisCalendarDate } from "@/lib/paris-calendar";

const KEY_ENABLED = "rc_reminder_enabled";
const KEY_LAST_SHOWN = "rc_reminder_last_shown";

export function isReminderEnabled() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(KEY_ENABLED) === "1";
}

export async function enableReminder(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  let perm = Notification.permission;
  if (perm === "default") {
    perm = await Notification.requestPermission();
  }
  if (perm !== "granted") return false;
  window.localStorage.setItem(KEY_ENABLED, "1");
  return true;
}

export function disableReminder() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY_ENABLED);
}

export function maybeShowDailyReminder() {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (!isReminderEnabled()) return;
  if (Notification.permission !== "granted") return;
  const today = parisCalendarDate();
  const last = window.localStorage.getItem(KEY_LAST_SHOWN);
  if (last === today) return;
  window.localStorage.setItem(KEY_LAST_SHOWN, today);
  const dailyUrl = `${window.location.origin}/question-du-jour`;
  try {
    const n = new Notification("Tu captes ?", {
      body: "Ton fil du jour t’attend — un mot à capter, sans pression.",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: "fil-du-jour",
      data: { url: dailyUrl },
    });
    n.onclick = () => {
      window.focus();
      window.location.assign("/question-du-jour");
      n.close();
    };
  } catch {
    // ignored
  }
}

export function isNotificationsSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}
