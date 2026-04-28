/**
 * Lightweight reminder helper using Notifications API.
 * Shows a daily reminder popup when the user opens the app on a new day,
 * if they have enabled the reminder. PWA push notifications proper would
 * require a service worker + push server, which is overkill here.
 */

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
  const today = new Date().toISOString().slice(0, 10);
  const last = window.localStorage.getItem(KEY_LAST_SHOWN);
  if (last === today) return;
  window.localStorage.setItem(KEY_LAST_SHOWN, today);
  try {
    new Notification("Reste connecté ! 🌟", {
      body: "Votre question du jour vous attend. Continuez votre série !",
      icon: "/icon-192.svg",
      badge: "/icon-192.svg",
    });
  } catch {
    // ignored
  }
}

export function isNotificationsSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}
