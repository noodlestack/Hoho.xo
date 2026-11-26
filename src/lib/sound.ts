export interface ChristmasTrack {
  id: string;
  title: string;
  tempoBpm: number;
  /** Pairs of [frequencyHz (0 = rest), durationInBeats] */
  notes: Array<[number, number]>;
}

const C4 = 261.63;
const D4 = 293.66;
const E4 = 329.63;
const F4 = 349.23;
const G4 = 392.0;
const A4 = 440.0;
const Bb4 = 466.16;
const B4 = 493.88;
const C5 = 523.25;
const D5 = 587.33;
const E5 = 659.25;
const F5 = 698.46;
const G5 = 783.99;

export const CHRISTMAS_TRACKS: ChristmasTrack[] = [
  {
    id: "jingle-bells",
    title: "Jingle Bells",
    tempoBpm: 142,
    notes: [
      [E5, 1], [E5, 1], [E5, 2],
      [E5, 1], [E5, 1], [E5, 2],
      [E5, 1], [G5, 1], [C5, 1.5], [D5, 0.5], [E5, 3], [0, 1],
      [F5, 1], [F5, 1], [F5, 1.5], [F5, 0.5],
      [F5, 1], [E5, 1], [E5, 1], [E5, 0.5], [E5, 0.5],
      [E5, 1], [D5, 1], [D5, 1], [E5, 1], [D5, 2], [G5, 2],
      [E5, 1], [E5, 1], [E5, 2],
      [E5, 1], [E5, 1], [E5, 2],
      [E5, 1], [G5, 1], [C5, 1.5], [D5, 0.5], [E5, 3], [0, 1],
      [F5, 1], [F5, 1], [F5, 1.5], [F5, 0.5],
      [F5, 1], [E5, 1], [E5, 1], [E5, 0.5], [E5, 0.5],
      [G5, 1], [G5, 1], [F5, 1], [D5, 1], [C5, 3], [0, 1],
    ],
  },
  {
    id: "silent-night",
    title: "Silent Night",
    tempoBpm: 92,
    notes: [
      [G4, 1.5], [A4, 0.5], [G4, 1], [E4, 3],
      [G4, 1.5], [A4, 0.5], [G4, 1], [E4, 3],
      [D5, 2], [D5, 1], [B4, 3],
      [C5, 2], [C5, 1], [G4, 3],
      [A4, 2], [A4, 1], [C5, 1.5], [B4, 0.5], [A4, 1],
      [G4, 1.5], [A4, 0.5], [G4, 1], [E4, 3],
      [D5, 2], [D5, 1], [F5, 1.5], [D5, 0.5], [B4, 1],
      [C5, 3], [E5, 3],
      [C5, 1.5], [G4, 0.5], [E4, 1], [G4, 1.5], [F4, 0.5], [D4, 1],
      [C4, 4], [0, 2],
    ],
  },
  {
    id: "merry-christmas",
    title: "We Wish You a Merry Christmas",
    tempoBpm: 132,
    notes: [
      [G4, 1], [C5, 1], [C5, 0.5], [D5, 0.5], [C5, 0.5], [B4, 0.5],
      [A4, 1], [A4, 1], [A4, 1],
      [D5, 1], [D5, 0.5], [E5, 0.5], [D5, 0.5], [C5, 0.5],
      [B4, 1], [G4, 1], [G4, 1],
      [E5, 1], [E5, 0.5], [F5, 0.5], [E5, 0.5], [D5, 0.5],
      [C5, 1], [A4, 1], [G4, 0.5], [G4, 0.5],
      [A4, 1], [D5, 1], [B4, 1], [C5, 2], [0, 1],
    ],
  },
  {
    id: "o-tannenbaum",
    title: "O Christmas Tree",
    tempoBpm: 108,
    notes: [
      [C4, 1], [F4, 1.5], [F4, 0.5], [F4, 1],
      [G4, 1], [A4, 1.5], [A4, 0.5], [A4, 1],
      [A4, 0.5], [G4, 0.5], [A4, 0.5], [Bb4, 1], [E4, 1], [G4, 1], [F4, 2],
      [C5, 0.5], [C5, 0.5], [A4, 0.5], [D5, 1.5], [C5, 0.5], [C5, 0.5], [Bb4, 0.5], [Bb4, 1.5],
      [Bb4, 0.5], [Bb4, 0.5], [G4, 0.5], [C5, 1.5], [Bb4, 0.5], [Bb4, 0.5], [A4, 0.5], [A4, 1],
      [C4, 1], [F4, 1.5], [F4, 0.5], [F4, 1],
      [G4, 1], [A4, 1.5], [A4, 0.5], [A4, 1],
      [A4, 0.5], [G4, 0.5], [A4, 0.5], [Bb4, 1], [E4, 1], [G4, 1], [F4, 2.5], [0, 0.5],
    ],
  },
];

let sharedCtx: AudioContext | null = null;
let musicBus: GainNode | null = null;
let sfxBus: GainNode | null = null;

type SampledCueKind = "drop" | "open" | "qr";
/** Populate paths after dropping Kenney CC0 .ogg files into public/audio/ (see LICENSES.md). */
const BUNDLED_CUE_PATHS: Partial<Record<SampledCueKind, string>> = {};
const cueBufferCache = new Map<SampledCueKind, AudioBuffer | null>();
const pendingCueLoads = new Map<SampledCueKind, Promise<void>>();

function preloadCueBuffer(
  ctx: AudioContext,
  kind: SampledCueKind,
  url: string,
): void {
  if (
    typeof fetch !== "function" ||
    cueBufferCache.has(kind) ||
    pendingCueLoads.has(kind)
  ) {
    return;
  }
  const job = fetch(url, { cache: "force-cache" })
    .then(async (res) => {
      if (!res.ok) {
        cueBufferCache.set(kind, null);
        return;
      }
      const arr = await res.arrayBuffer();
      const decoded = await ctx.decodeAudioData(arr);
      cueBufferCache.set(kind, decoded);
    })
    .catch(() => {
      cueBufferCache.set(kind, null);
    })
    .finally(() => {
      pendingCueLoads.delete(kind);
    });
  pendingCueLoads.set(kind, job);
}

function playDecodedCueBuffer(
  ctx: AudioContext,
  destination: AudioNode,
  buffer: AudioBuffer,
): void {
  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  source.buffer = buffer;
  gain.gain.setValueAtTime(0.45, ctx.currentTime);
  source.connect(gain);
  gain.connect(destination);
  source.start();
}

let currentTrackIdx = 0;
let musicPlaying = false;
let schedulerId: number | null = null;
let noteIndex = 0;
let nextNoteTime = 0;
let visibilityBound = false;

function ensureAudioBuses(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) return null;

  if (!sharedCtx) {
    sharedCtx = new AudioCtx();
    const compressor = sharedCtx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-16, sharedCtx.currentTime);
    compressor.ratio.setValueAtTime(3, sharedCtx.currentTime);

    const lowpass = sharedCtx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.setValueAtTime(3200, sharedCtx.currentTime);

    lowpass.connect(compressor);
    compressor.connect(sharedCtx.destination);

    musicBus = sharedCtx.createGain();
    musicBus.gain.setValueAtTime(0.42, sharedCtx.currentTime);
    musicBus.connect(lowpass);

    sfxBus = sharedCtx.createGain();
    sfxBus.gain.setValueAtTime(0.65, sharedCtx.currentTime);
    sfxBus.connect(lowpass);
  }

  if (sharedCtx.state === "suspended") {
    void sharedCtx.resume().catch(() => {});
  }
  return sharedCtx;
}

/**
 * Plays a warm celesta/music-box partial note with fast octave shimmer and click-free envelope.
 */
function triggerCelestaVoice(
  ctx: AudioContext,
  destination: AudioNode,
  freqHz: number,
  startTime: number,
  durationSec: number,
  peakGain: number,
): void {
  if (freqHz <= 0) return;

  const mainOsc = ctx.createOscillator();
  const mainGain = ctx.createGain();
  mainOsc.type = "sine";
  mainOsc.frequency.setValueAtTime(freqHz, startTime);

  mainGain.gain.setValueAtTime(0.0001, startTime);
  mainGain.gain.linearRampToValueAtTime(peakGain, startTime + 0.012);
  mainGain.gain.exponentialRampToValueAtTime(
    0.0001,
    startTime + Math.max(0.22, durationSec),
  );

  mainOsc.connect(mainGain);
  mainGain.connect(destination);
  mainOsc.start(startTime);
  mainOsc.stop(startTime + Math.max(0.25, durationSec + 0.03));

  const harmonicOsc = ctx.createOscillator();
  const harmonicGain = ctx.createGain();
  harmonicOsc.type = "triangle";
  harmonicOsc.frequency.setValueAtTime(freqHz * 2, startTime);

  harmonicGain.gain.setValueAtTime(0.0001, startTime);
  harmonicGain.gain.linearRampToValueAtTime(peakGain * 0.22, startTime + 0.008);
  harmonicGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.18);

  harmonicOsc.connect(harmonicGain);
  harmonicGain.connect(destination);
  harmonicOsc.start(startTime);
  harmonicOsc.stop(startTime + 0.2);
}

function scheduleMusicTick(): void {
  if (!musicPlaying || !sharedCtx || !musicBus) return;
  if (typeof document !== "undefined" && document.hidden) return;

  const track = CHRISTMAS_TRACKS[currentTrackIdx] ?? CHRISTMAS_TRACKS[0];
  const secPerBeat = 60 / track.tempoBpm;

  while (nextNoteTime < sharedCtx.currentTime + 0.28) {
    const [freq, beats] = track.notes[noteIndex % track.notes.length];
    const stepSec = Math.max(0.08, beats * secPerBeat);

    if (freq > 0) {
      triggerCelestaVoice(
        sharedCtx,
        musicBus,
        freq,
        nextNoteTime,
        Math.min(1.35, stepSec * 1.35),
        0.055,
      );
      if (beats >= 2) {
        triggerCelestaVoice(
          sharedCtx,
          musicBus,
          freq * 0.5,
          nextNoteTime,
          Math.min(1.4, stepSec * 1.25),
          0.025,
        );
      }
    }

    nextNoteTime += stepSec;
    noteIndex = (noteIndex + 1) % track.notes.length;
  }
}

function handleMusicVisibilityChange(): void {
  if (typeof document === "undefined") return;
  if (document.hidden && musicPlaying) {
    stopChristmasMusic();
  }
}

export function getCurrentChristmasTrack(): ChristmasTrack {
  return CHRISTMAS_TRACKS[currentTrackIdx] ?? CHRISTMAS_TRACKS[0];
}

export function isChristmasMusicPlaying(): boolean {
  return musicPlaying;
}

export function startChristmasMusic(trackIndex?: number): boolean {
  try {
    if (typeof trackIndex === "number" && Number.isFinite(trackIndex)) {
      currentTrackIdx =
        ((Math.floor(trackIndex) % CHRISTMAS_TRACKS.length) +
          CHRISTMAS_TRACKS.length) %
        CHRISTMAS_TRACKS.length;
    }

    const ctx = ensureAudioBuses();
    if (!ctx || !musicBus) return false;

    if (schedulerId !== null && typeof window !== "undefined") {
      window.clearInterval(schedulerId);
      schedulerId = null;
    }

    musicBus.gain.cancelScheduledValues(ctx.currentTime);
    musicBus.gain.setValueAtTime(0.42, ctx.currentTime);

    musicPlaying = true;
    noteIndex = 0;
    nextNoteTime = ctx.currentTime + 0.04;
    scheduleMusicTick();

    if (typeof window !== "undefined") {
      schedulerId = window.setInterval(scheduleMusicTick, 120);
    }

    if (!visibilityBound && typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleMusicVisibilityChange);
      visibilityBound = true;
    }

    return true;
  } catch {
    musicPlaying = false;
    return false;
  }
}

export function stopChristmasMusic(): void {
  musicPlaying = false;
  if (schedulerId !== null && typeof window !== "undefined") {
    window.clearInterval(schedulerId);
    schedulerId = null;
  }
  if (sharedCtx && musicBus) {
    try {
      const now = sharedCtx.currentTime;
      musicBus.gain.cancelScheduledValues(now);
      musicBus.gain.setValueAtTime(musicBus.gain.value, now);
      musicBus.gain.linearRampToValueAtTime(0.0001, now + 0.12);
    } catch {
      // Ignore cleanup errors
    }
  }
}

export function toggleChristmasMusic(): boolean {
  if (musicPlaying) {
    stopChristmasMusic();
    return false;
  }
  return startChristmasMusic(currentTrackIdx);
}

export function nextChristmasTrack(): ChristmasTrack {
  currentTrackIdx = (currentTrackIdx + 1) % CHRISTMAS_TRACKS.length;
  if (musicPlaying) {
    startChristmasMusic(currentTrackIdx);
  }
  return getCurrentChristmasTrack();
}

/**
 * Plays warm winter sound effects synced to user gestures (ornament hang, unwrap, QR morph, UI click).
 */
export function playOrnamentChime(
  kind: "drop" | "open" | "qr" | "click" | "celebrate",
): void {
  try {
    const ctx = ensureAudioBuses();
    if (!ctx || !sfxBus) return;

    if (kind === "drop" || kind === "open" || kind === "qr") {
      const cached = cueBufferCache.get(kind);
      if (cached) {
        playDecodedCueBuffer(ctx, sfxBus, cached);
        return;
      }
      const url = BUNDLED_CUE_PATHS[kind];
      if (url && !cueBufferCache.has(kind)) {
        preloadCueBuffer(ctx, kind, url);
      }
    }

    const now = ctx.currentTime;
    const patterns: Record<
      typeof kind,
      { freqs: number[]; spacing: number; duration: number; gain: number }
    > = {
      drop: {
        freqs: [1046.5, 1318.51, 1567.98, 2093.0],
        spacing: 0.06,
        duration: 0.6,
        gain: 0.055,
      },
      open: {
        freqs: [587.33, 880.0, 1174.66],
        spacing: 0.05,
        duration: 0.5,
        gain: 0.048,
      },
      qr: {
        freqs: [783.99, 1174.66, 1567.98],
        spacing: 0.04,
        duration: 0.38,
        gain: 0.036,
      },
      click: {
        freqs: [1318.51],
        spacing: 0,
        duration: 0.14,
        gain: 0.022,
      },
      celebrate: {
        freqs: [659.25, 783.99, 1046.5, 1318.51],
        spacing: 0.075,
        duration: 0.65,
        gain: 0.055,
      },
    };

    const spec = patterns[kind];
    spec.freqs.forEach((freq, idx) => {
      triggerCelestaVoice(
        ctx,
        sfxBus!,
        freq,
        now + idx * spec.spacing,
        spec.duration,
        spec.gain,
      );
    });

    if (kind === "drop" || kind === "celebrate") {
      [3135.96, 3520.0, 4186.01].forEach((bellFreq, idx) => {
        triggerCelestaVoice(
          ctx,
          sfxBus!,
          bellFreq,
          now + 0.12 + idx * 0.045,
          0.22,
          0.011,
        );
      });
    }
  } catch {
    // Ignore audio context restrictions gracefully
  }
}
