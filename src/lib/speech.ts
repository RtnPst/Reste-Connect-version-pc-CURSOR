/**
 * Speech synthesis helper for accessibility.
 * Uses the browser's built-in French voice.
 */

let currentUtterance: SpeechSynthesisUtterance | null = null;

export function speak(text: string, enabled: boolean = true) {
  if (!enabled || typeof window === "undefined" || !window.speechSynthesis) return;

  // Stop anything currently being spoken
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "fr-FR";
  utterance.rate = 0.95;
  utterance.pitch = 1;

  // Try to find a French voice
  const voices = window.speechSynthesis.getVoices();
  const frenchVoice = voices.find((v) => v.lang.startsWith("fr"));
  if (frenchVoice) utterance.voice = frenchVoice;

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  currentUtterance = null;
}

export function isSpeechSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}
