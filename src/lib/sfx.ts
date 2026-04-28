/**
 * Lightweight sound effects via WebAudio (no external assets needed).
 * Each helper is a no-op when disabled or when running on the server.
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  return ctx;
}

function tone(
  freq: number,
  duration: number,
  type: OscillatorType = "sine",
  volume = 0.15,
  when = 0,
) {
  const ac = getCtx();
  if (!ac) return;
  const start = ac.currentTime + when;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

export function playCorrect(enabled = true) {
  if (!enabled) return;
  // C5 -> E5 -> G5 happy arpeggio
  tone(523.25, 0.12, "triangle", 0.18, 0);
  tone(659.25, 0.12, "triangle", 0.18, 0.1);
  tone(783.99, 0.2, "triangle", 0.2, 0.2);
}

export function playWrong(enabled = true) {
  if (!enabled) return;
  tone(220, 0.18, "sawtooth", 0.12, 0);
  tone(180, 0.25, "sawtooth", 0.1, 0.12);
}

export function playFanfare(enabled = true) {
  if (!enabled) return;
  // Mini fanfare
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((f, i) => tone(f, 0.18, "triangle", 0.18, i * 0.12));
  tone(1046.5, 0.4, "triangle", 0.2, notes.length * 0.12);
}

export function playClick(enabled = true) {
  if (!enabled) return;
  tone(600, 0.05, "square", 0.08, 0);
}

/* ------------------ Ambient music (gentle loop) ------------------ */

let musicNodes: {
  osc: OscillatorNode;
  gain: GainNode;
  lfo?: OscillatorNode;
  lfoGain?: GainNode;
} | null = null;

export function startMusic(volume = 0.05) {
  const ac = getCtx();
  if (!ac || musicNodes) return;
  // Soft pad: two detuned oscillators through a slow LFO on gain
  const gain = ac.createGain();
  gain.gain.value = 0;
  gain.gain.linearRampToValueAtTime(volume, ac.currentTime + 1.5);
  gain.connect(ac.destination);

  const osc = ac.createOscillator();
  osc.type = "sine";
  osc.frequency.value = 220; // A3
  osc.connect(gain);

  const lfo = ac.createOscillator();
  const lfoGain = ac.createGain();
  lfo.frequency.value = 0.15;
  lfoGain.gain.value = volume * 0.6;
  lfo.connect(lfoGain);
  lfoGain.connect(gain.gain);

  osc.start();
  lfo.start();
  musicNodes = { osc, gain, lfo, lfoGain };
}

export function stopMusic() {
  const ac = getCtx();
  if (!ac || !musicNodes) return;
  const { osc, gain, lfo } = musicNodes;
  gain.gain.cancelScheduledValues(ac.currentTime);
  gain.gain.linearRampToValueAtTime(0, ac.currentTime + 0.6);
  setTimeout(() => {
    try {
      osc.stop();
    } catch (error) {
      void error;
    }
    try {
      lfo?.stop();
    } catch (error) {
      void error;
    }
  }, 700);
  musicNodes = null;
}

export function isMusicPlaying() {
  return musicNodes !== null;
}
