/* Tiny Web Audio toolkit: drum hits, tones, melodies and pitch detection. */
let ctx: AudioContext | null = null;

export function audio(): AudioContext {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function drum(at = 0, accent = false) {
  const a = audio();
  const t = a.currentTime + at;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(accent ? 220 : 170, t);
  osc.frequency.exponentialRampToValueAtTime(55, t + 0.16);
  gain.gain.setValueAtTime(accent ? 1 : 0.8, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
  osc.connect(gain).connect(a.destination);
  osc.start(t);
  osc.stop(t + 0.3);
}

export function tone(freq: number, dur: number, at = 0, type: OscillatorType = "triangle", vol = 0.25) {
  const a = audio();
  const t = a.currentTime + at;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(vol, t + 0.03);
  gain.gain.setValueAtTime(vol, t + Math.max(0.04, dur - 0.08));
  gain.gain.linearRampToValueAtTime(0, t + dur);
  osc.connect(gain).connect(a.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

const SEMI: Record<string, number> = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
export function noteFreq(name: string): number {
  const m = name.match(/^([A-G])(#|b)?(\d)$/);
  if (!m) return 440;
  const semis = SEMI[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0) + (Number(m[3]) - 4) * 12;
  return 440 * Math.pow(2, semis / 12);
}

export function playNotes(notes: [string, number][]): number {
  let t = 0;
  for (const [n, d] of notes) {
    tone(noteFreq(n), d * 0.95, t);
    t += d;
  }
  return t;
}

/** Autocorrelation pitch detector. Returns Hz, or -1 when the signal is too quiet or unclear. */
export function detectPitch(buf: Float32Array, sampleRate: number): number {
  let rms = 0;
  for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / buf.length);
  if (rms < 0.012) return -1;

  let r1 = 0;
  let r2 = buf.length - 1;
  const thres = 0.2;
  for (let i = 0; i < buf.length / 2; i++) if (Math.abs(buf[i]) < thres) { r1 = i; break; }
  for (let i = 1; i < buf.length / 2; i++) if (Math.abs(buf[buf.length - i]) < thres) { r2 = buf.length - i; break; }
  const b = buf.slice(r1, r2);
  const n = b.length;
  const c = new Array(n).fill(0);
  for (let i = 0; i < n; i++) for (let j = 0; j < n - i; j++) c[i] += b[j] * b[j + i];
  let d = 0;
  while (d < n - 1 && c[d] > c[d + 1]) d++;
  let maxval = -1;
  let maxpos = -1;
  for (let i = d; i < n; i++) if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
  if (maxpos <= 0) return -1;
  let t0 = maxpos;
  const x1 = c[t0 - 1], x2 = c[t0], x3 = c[t0 + 1] ?? x2;
  const a = (x1 + x3 - 2 * x2) / 2;
  const bb = (x3 - x1) / 2;
  if (a) t0 = t0 - bb / (2 * a);
  const hz = sampleRate / t0;
  return hz > 70 && hz < 1100 ? hz : -1;
}

/** Distance in cents between two frequencies, ignoring octave (humming an octave lower is fine). */
export function centsOff(hz: number, target: number): number {
  const cents = 1200 * Math.log2(hz / target);
  const folded = ((cents % 1200) + 1200) % 1200;
  return Math.min(folded, 1200 - folded);
}
