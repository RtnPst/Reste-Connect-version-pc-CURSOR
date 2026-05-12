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

/** Short “got it” chime: clear, warm, not jackpot-loud. */
export function playCorrect(enabled = true) {
  if (!enabled) return;
  tone(523.25, 0.1, "sine", 0.1, 0);
  tone(659.25, 0.1, "sine", 0.09, 0.085);
  tone(783.99, 0.14, "sine", 0.085, 0.17);
}

/** Soft descending cue: readable “not quite” without buzz or punishment. */
export function playWrong(enabled = true) {
  if (!enabled) return;
  tone(392.0, 0.1, "sine", 0.08, 0);
  tone(329.63, 0.15, "sine", 0.065, 0.09);
}

/** Light run-end lift: shorter, less bright peak than a full arcade fanfare. */
export function playFanfare(enabled = true) {
  if (!enabled) return;
  const notes = [523.25, 659.25, 783.99, 880.0];
  const step = 0.1;
  notes.forEach((f, i) => tone(f, 0.12, "triangle", 0.11, i * step));
  tone(880.0, 0.2, "sine", 0.095, notes.length * step);
}

export function playClick(enabled = true) {
  if (!enabled) return;
  tone(520, 0.035, "sine", 0.042, 0);
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
