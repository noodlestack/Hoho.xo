export type MusicAudioMode = "recorded" | "musicbox";

export interface ChristmasTrack {
  id: string;
  title: string;
  artist: string;
  durationHint: string;
  license: string;
  audioUrl: string;
  tempoBpm: number;
  /** Pairs of [frequencyHz (0 = rest), durationInBeats] for Celesta Music Box mode / offline fallback */
  notes: Array<[number, number]>;
}

export interface PlaylistSnapshot {
  playing: boolean;
  loading: boolean;
  trackIndex: number;
  track: ChristmasTrack;
  currentTime: number;
  duration: number;
  volume: number;
  shuffle: boolean;
  loopOne: boolean;
  mode: MusicAudioMode;
}

const C4 = 261.63;
const D4 = 293.66;
const E4 = 329.63;
const F4 = 349.23;
const Fs4 = 369.99;
const G4 = 392.0;
const Gs4 = 415.3;
const A4 = 440.0;
const Bb4 = 466.16;
const B4 = 493.88;
const C5 = 523.25;
const Cs5 = 554.37;
const D5 = 587.33;
const Eb5 = 622.25;
const E5 = 659.25;
const F5 = 698.46;
const Fs5 = 739.99;
const G5 = 783.99;
const A5 = 880.0;

/**
 * 10 Classic Christmas recordings verified in browser with CORS (`Access-Control-Allow-Origin: *`)
 * from Wikimedia Commons (Public Domain US Air Force ensembles + Kevin MacLeod CC BY 3.0),
 * paired with built-in WebAudio Celesta Music Box arrangements.
 */
export const CHRISTMAS_TRACKS: ChristmasTrack[] = [
  {
    id: "jingle-bells",
    title: "Jingle Bells",
    artist: "USAF Band of Mid-America",
    durationHint: "1:48",
    license: "Public Domain",
    audioUrl:
      "https://upload.wikimedia.org/wikipedia/commons/7/72/Jingle_Bells_%282020%29_-_Starlifter_and_Roots_in_Blue_-_United_States_Air_Force_Band_of_Mid-America.mp3",
    tempoBpm: 142,
    notes: [
      [E5, 1],
      [E5, 1],
      [E5, 2],
      [E5, 1],
      [E5, 1],
      [E5, 2],
      [E5, 1],
      [G5, 1],
      [C5, 1.5],
      [D5, 0.5],
      [E5, 3],
      [0, 1],
      [F5, 1],
      [F5, 1],
      [F5, 1.5],
      [F5, 0.5],
      [F5, 1],
      [E5, 1],
      [E5, 1],
      [E5, 0.5],
      [E5, 0.5],
      [E5, 1],
      [D5, 1],
      [D5, 1],
      [E5, 1],
      [D5, 2],
      [G5, 2],
      [E5, 1],
      [E5, 1],
      [E5, 2],
      [E5, 1],
      [E5, 1],
      [E5, 2],
      [E5, 1],
      [G5, 1],
      [C5, 1.5],
      [D5, 0.5],
      [E5, 3],
      [0, 1],
      [F5, 1],
      [F5, 1],
      [F5, 1.5],
      [F5, 0.5],
      [F5, 1],
      [E5, 1],
      [E5, 1],
      [E5, 0.5],
      [E5, 0.5],
      [G5, 1],
      [G5, 1],
      [F5, 1],
      [D5, 1],
      [C5, 3],
      [0, 1],
    ],
  },
  {
    id: "carol-of-the-bells",
    title: "Carol of the Bells",
    artist: "USAF Heritage of America Band",
    durationHint: "1:25",
    license: "Public Domain",
    audioUrl:
      "https://upload.wikimedia.org/wikipedia/commons/c/c6/Carol_of_the_Bells%2C_Ukrainian_-_Concert_Band_-_United_States_Air_Force_Heritage_of_America_Band.mp3",
    tempoBpm: 156,
    notes: [
      [Bb4, 1],
      [A4, 0.5],
      [Bb4, 0.5],
      [G4, 1],
      [Bb4, 1],
      [A4, 0.5],
      [Bb4, 0.5],
      [G4, 1],
      [Bb4, 1],
      [A4, 0.5],
      [Bb4, 0.5],
      [G4, 1],
      [Bb4, 1],
      [A4, 0.5],
      [Bb4, 0.5],
      [G4, 1],
      [D5, 1],
      [C5, 0.5],
      [D5, 0.5],
      [Bb4, 1],
      [D5, 1],
      [C5, 0.5],
      [D5, 0.5],
      [Bb4, 1],
      [G5, 1],
      [G5, 0.5],
      [G5, 0.5],
      [F5, 0.5],
      [Eb5, 0.5],
      [D5, 1],
      [D5, 0.5],
      [D5, 0.5],
      [C5, 0.5],
      [Bb4, 0.5],
      [C5, 1],
      [C5, 0.5],
      [C5, 0.5],
      [D5, 0.5],
      [C5, 0.5],
      [G4, 2],
      [0, 1],
    ],
  },
  {
    id: "silent-night",
    title: "Silent Night",
    artist: "USAF Band of Mid-America",
    durationHint: "3:42",
    license: "Public Domain",
    audioUrl:
      "https://upload.wikimedia.org/wikipedia/commons/5/51/Silent_Night_%282020%29_-_Starlifter_and_Roots_in_Blue_-_United_States_Air_Force_Band_of_Mid-America.mp3",
    tempoBpm: 92,
    notes: [
      [G4, 1.5],
      [A4, 0.5],
      [G4, 1],
      [E4, 3],
      [G4, 1.5],
      [A4, 0.5],
      [G4, 1],
      [E4, 3],
      [D5, 2],
      [D5, 1],
      [B4, 3],
      [C5, 2],
      [C5, 1],
      [G4, 3],
      [A4, 2],
      [A4, 1],
      [C5, 1.5],
      [B4, 0.5],
      [A4, 1],
      [G4, 1.5],
      [A4, 0.5],
      [G4, 1],
      [E4, 3],
      [D5, 2],
      [D5, 1],
      [F5, 1.5],
      [D5, 0.5],
      [B4, 1],
      [C5, 3],
      [E5, 3],
      [C5, 1.5],
      [G4, 0.5],
      [E4, 1],
      [G4, 1.5],
      [F4, 0.5],
      [D4, 1],
      [C4, 4],
      [0, 2],
    ],
  },
  {
    id: "merry-christmas",
    title: "We Wish You a Merry Christmas",
    artist: "USAF Band of Mid-America",
    durationHint: "1:50",
    license: "Public Domain",
    audioUrl:
      "https://upload.wikimedia.org/wikipedia/commons/6/65/We_Wish_You_a_Merry_Christmas_%282020%29_-_Starlifter_and_Roots_in_Blue_-_United_States_Air_Force_Band_of_Mid-America.mp3",
    tempoBpm: 132,
    notes: [
      [G4, 1],
      [C5, 1],
      [C5, 0.5],
      [D5, 0.5],
      [C5, 0.5],
      [B4, 0.5],
      [A4, 1],
      [A4, 1],
      [A4, 1],
      [D5, 1],
      [D5, 0.5],
      [E5, 0.5],
      [D5, 0.5],
      [C5, 0.5],
      [B4, 1],
      [G4, 1],
      [G4, 1],
      [E5, 1],
      [E5, 0.5],
      [F5, 0.5],
      [E5, 0.5],
      [D5, 0.5],
      [C5, 1],
      [A4, 1],
      [G4, 0.5],
      [G4, 0.5],
      [A4, 1],
      [D5, 1],
      [B4, 1],
      [C5, 2],
      [0, 1],
    ],
  },
  {
    id: "deck-the-halls",
    title: "Deck the Halls",
    artist: "Singing Sergeants · USAF Band",
    durationHint: "1:36",
    license: "Public Domain",
    audioUrl:
      "https://upload.wikimedia.org/wikipedia/commons/8/8a/Deck_the_Halls_-_Singing_Sergeants_-_United_States_Air_Force_Band.mp3",
    tempoBpm: 138,
    notes: [
      [G5, 1.5],
      [F5, 0.5],
      [E5, 1],
      [D5, 1],
      [C5, 1],
      [D5, 1],
      [E5, 1],
      [C5, 1],
      [D5, 0.5],
      [E5, 0.5],
      [F5, 0.5],
      [D5, 0.5],
      [E5, 1.5],
      [D5, 0.5],
      [C5, 1],
      [B4, 1],
      [C5, 2],
      [D5, 1.5],
      [E5, 0.5],
      [F5, 1],
      [D5, 1],
      [E5, 1.5],
      [F5, 0.5],
      [G5, 1],
      [D5, 1],
      [E5, 0.5],
      [Fs5, 0.5],
      [G5, 1],
      [A5, 0.5],
      [B4, 0.5],
      [C5, 1],
      [G5, 1],
      [F5, 1],
      [E5, 1],
      [D5, 1],
      [C5, 2],
      [0, 1],
    ],
  },
  {
    id: "sugar-plum-fairy",
    title: "Dance of the Sugar Plum Fairy",
    artist: "Kevin MacLeod",
    durationHint: "2:12",
    license: "CC BY 3.0",
    audioUrl:
      "https://upload.wikimedia.org/wikipedia/commons/d/d1/Dance_of_the_Sugar_Plum_Fairy_%28ISRC_USUAN1100625%29.mp3",
    tempoBpm: 124,
    notes: [
      [G5, 0.5],
      [E5, 0.5],
      [G5, 1],
      [Fs5, 1],
      [Eb5, 1],
      [E5, 1],
      [D5, 0.5],
      [D5, 0.5],
      [D5, 1],
      [Cs5, 0.5],
      [Cs5, 0.5],
      [Cs5, 1],
      [C5, 0.5],
      [C5, 0.5],
      [C5, 1],
      [B4, 0.5],
      [E5, 0.5],
      [C5, 0.5],
      [E5, 0.5],
      [B4, 2],
      [0, 1],
    ],
  },
  {
    id: "o-holy-night",
    title: "O Holy Night",
    artist: "USAF Band of Mid-America",
    durationHint: "2:28",
    license: "Public Domain",
    audioUrl:
      "https://upload.wikimedia.org/wikipedia/commons/b/b7/O_Holy_Night_%282020%29_-_Starlifter_and_Roots_in_Blue_-_United_States_Air_Force_Band_of_Mid-America.mp3",
    tempoBpm: 88,
    notes: [
      [E4, 1.5],
      [E4, 0.5],
      [E4, 1],
      [G4, 2],
      [G4, 1],
      [A4, 1.5],
      [A4, 0.5],
      [F4, 1],
      [A4, 2],
      [C5, 1],
      [G4, 1],
      [G4, 0.5],
      [E4, 0.5],
      [D4, 1],
      [C4, 2],
      [E4, 1],
      [F4, 1.5],
      [G4, 0.5],
      [F4, 1],
      [D4, 2.5],
      [0, 0.5],
      [G4, 2],
      [G4, 1],
      [A4, 2],
      [D4, 1],
      [G4, 2],
      [A4, 1],
      [B4, 2],
      [G4, 1],
      [C5, 3],
      [B4, 1.5],
      [A4, 0.5],
      [G4, 1],
      [C5, 3],
      [0, 1],
    ],
  },
  {
    id: "joy-to-the-world",
    title: "Joy to the World",
    artist: "USAF Band of Mid-America",
    durationHint: "1:54",
    license: "Public Domain",
    audioUrl:
      "https://upload.wikimedia.org/wikipedia/commons/f/f1/Joy_to_the_World_%282020%29_-_Starlifter_and_Roots_in_Blue_-_United_States_Air_Force_Band_of_Mid-America.mp3",
    tempoBpm: 120,
    notes: [
      [C5, 2],
      [B4, 1.5],
      [A4, 0.5],
      [G4, 3],
      [F4, 1],
      [E4, 2],
      [D4, 2],
      [C4, 3],
      [G4, 1],
      [A4, 3],
      [A4, 1],
      [B4, 3],
      [B4, 1],
      [C5, 3],
      [C5, 1],
      [C5, 1],
      [B4, 1],
      [A4, 1],
      [G4, 1],
      [G4, 1.5],
      [F4, 0.5],
      [E4, 1],
      [E4, 1],
      [E4, 1],
      [F4, 0.5],
      [G4, 1.5],
      [F4, 0.5],
      [E4, 0.5],
      [D4, 1],
      [D4, 1],
      [D4, 1],
      [E4, 0.5],
      [F4, 1.5],
      [E4, 0.5],
      [D4, 0.5],
      [C4, 1],
      [C5, 2],
      [A4, 1],
      [G4, 1.5],
      [F4, 0.5],
      [E4, 1],
      [F4, 1],
      [E4, 2],
      [D4, 2],
      [C4, 3],
      [0, 1],
    ],
  },
  {
    id: "hark-the-herald",
    title: "Hark! The Herald Angels Sing",
    artist: "Singing Sergeants · USAF Band",
    durationHint: "3:18",
    license: "Public Domain",
    audioUrl:
      "https://upload.wikimedia.org/wikipedia/commons/e/ee/Hark_the_Herald_Angels_Sing_-_Singing_Sergeants_-_United_States_Air_Force_Band.mp3",
    tempoBpm: 116,
    notes: [
      [C4, 1],
      [F4, 1],
      [F4, 1.5],
      [E4, 0.5],
      [F4, 1],
      [A4, 1],
      [A4, 1],
      [G4, 1],
      [C5, 1],
      [C5, 1],
      [C5, 1.5],
      [Bb4, 0.5],
      [A4, 1],
      [G4, 1],
      [A4, 2],
      [C5, 1],
      [C5, 1],
      [F4, 1],
      [Bb4, 1],
      [A4, 1],
      [G4, 1],
      [F4, 2],
      [0, 1],
    ],
  },
  {
    id: "o-tannenbaum",
    title: "O Christmas Tree",
    artist: "Singing Sergeants · USAF Band",
    durationHint: "2:08",
    license: "Public Domain",
    audioUrl:
      "https://upload.wikimedia.org/wikipedia/commons/3/30/O_Tannenbaum_-_Singing_Sergeants_-_United_States_Air_Force_Band.mp3",
    tempoBpm: 108,
    notes: [
      [C4, 1],
      [F4, 1.5],
      [F4, 0.5],
      [F4, 1],
      [G4, 1],
      [A4, 1.5],
      [A4, 0.5],
      [A4, 1],
      [A4, 0.5],
      [G4, 0.5],
      [A4, 0.5],
      [Bb4, 1],
      [E4, 1],
      [G4, 1],
      [F4, 2],
      [C5, 0.5],
      [C5, 0.5],
      [A4, 0.5],
      [D5, 1.5],
      [C5, 0.5],
      [C5, 0.5],
      [Bb4, 0.5],
      [Bb4, 1.5],
      [Bb4, 0.5],
      [Bb4, 0.5],
      [G4, 0.5],
      [C5, 1.5],
      [Bb4, 0.5],
      [Bb4, 0.5],
      [A4, 0.5],
      [A4, 1],
      [C4, 1],
      [F4, 1.5],
      [F4, 0.5],
      [F4, 1],
      [G4, 1],
      [A4, 1.5],
      [A4, 0.5],
      [A4, 1],
      [A4, 0.5],
      [G4, 0.5],
      [A4, 0.5],
      [Bb4, 1],
      [E4, 1],
      [G4, 1],
      [F4, 2.5],
      [0, 0.5],
    ],
  },
];

// Unused accidentals kept handy for harmonic extensions
void Fs4;
void Gs4;

let sharedCtx: AudioContext | null = null;
let musicBus: GainNode | null = null;
let sfxBus: GainNode | null = null;
let htmlAudio: HTMLAudioElement | null = null;

type SampledCueKind = "drop" | "open" | "qr";
const BUNDLED_CUE_PATHS: Partial<Record<SampledCueKind, string>> = {};
const cueBufferCache = new Map<SampledCueKind, AudioBuffer | null>();
const pendingCueLoads = new Map<SampledCueKind, Promise<void>>();

let currentTrackIdx = 0;
let musicPlaying = false;
let musicLoading = false;
let currentTimeSec = 0;
let durationSec = 0;
let volumeLevel = 0.72;
let shuffleEnabled = false;
let loopOneEnabled = false;
let audioMode: MusicAudioMode = "recorded";

let schedulerId: number | null = null;
let noteIndex = 0;
let nextNoteTime = 0;
let synthStartedAt = 0;

const listeners = new Set<(snap: PlaylistSnapshot) => void>();

function emitSnapshot(): void {
  const snap = getPlaylistSnapshot();
  listeners.forEach((cb) => {
    try {
      cb(snap);
    } catch {
      // Ignore listener errors
    }
  });
}

export function getPlaylistSnapshot(): PlaylistSnapshot {
  const track = CHRISTMAS_TRACKS[currentTrackIdx] ?? CHRISTMAS_TRACKS[0];
  return {
    playing: musicPlaying,
    loading: musicLoading,
    trackIndex: currentTrackIdx,
    track,
    currentTime: currentTimeSec,
    duration: durationSec,
    volume: volumeLevel,
    shuffle: shuffleEnabled,
    loopOne: loopOneEnabled,
    mode: audioMode,
  };
}

export function subscribePlaylist(
  listener: (snap: PlaylistSnapshot) => void,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

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
    lowpass.frequency.setValueAtTime(3600, sharedCtx.currentTime);

    lowpass.connect(compressor);
    compressor.connect(sharedCtx.destination);

    musicBus = sharedCtx.createGain();
    musicBus.gain.setValueAtTime(0.42 * volumeLevel, sharedCtx.currentTime);
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

function triggerCelestaVoice(
  ctx: AudioContext,
  destination: AudioNode,
  freqHz: number,
  startTime: number,
  durationNoteSec: number,
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
    startTime + Math.max(0.22, durationNoteSec),
  );

  mainOsc.connect(mainGain);
  mainGain.connect(destination);
  mainOsc.start(startTime);
  mainOsc.stop(startTime + Math.max(0.25, durationNoteSec + 0.03));

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

function computeSynthLoopDuration(track: ChristmasTrack): number {
  const secPerBeat = 60 / track.tempoBpm;
  return track.notes.reduce(
    (sum, [, beats]) => sum + Math.max(0.08, beats * secPerBeat),
    0,
  );
}

function scheduleMusicTick(): void {
  if (!musicPlaying || audioMode !== "musicbox" || !sharedCtx || !musicBus) {
    return;
  }
  if (typeof document !== "undefined" && document.hidden) return;

  const track = CHRISTMAS_TRACKS[currentTrackIdx] ?? CHRISTMAS_TRACKS[0];
  const secPerBeat = 60 / track.tempoBpm;
  const loopDur = Math.max(4, computeSynthLoopDuration(track));
  durationSec = loopDur;
  currentTimeSec = (sharedCtx.currentTime - synthStartedAt) % loopDur;

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
        0.058,
      );
      if (beats >= 2) {
        triggerCelestaVoice(
          sharedCtx,
          musicBus,
          freq * 0.5,
          nextNoteTime,
          Math.min(1.4, stepSec * 1.25),
          0.026,
        );
      }
    }

    nextNoteTime += stepSec;
    noteIndex += 1;
    if (noteIndex >= track.notes.length) {
      noteIndex = 0;
      if (!loopOneEnabled) {
        advanceToNextIndex();
        synthStartedAt = sharedCtx.currentTime;
      }
    }
  }
  emitSnapshot();
}

function advanceToNextIndex(): void {
  if (shuffleEnabled && CHRISTMAS_TRACKS.length > 1) {
    let pick = currentTrackIdx;
    for (let i = 0; i < 6 && pick === currentTrackIdx; i += 1) {
      pick = Math.floor(Math.random() * CHRISTMAS_TRACKS.length);
    }
    currentTrackIdx = pick;
  } else {
    currentTrackIdx = (currentTrackIdx + 1) % CHRISTMAS_TRACKS.length;
  }
}

function ensureHtmlAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined" || typeof Audio === "undefined") {
    return null;
  }
  if (!htmlAudio) {
    const el = new Audio();
    el.crossOrigin = "anonymous";
    el.preload = "metadata";
    el.volume = volumeLevel;

    el.addEventListener("loadstart", () => {
      if (musicPlaying && audioMode === "recorded") {
        musicLoading = true;
        emitSnapshot();
      }
    });
    el.addEventListener("loadedmetadata", () => {
      if (Number.isFinite(el.duration) && el.duration > 0) {
        durationSec = el.duration;
      }
      musicLoading = false;
      emitSnapshot();
    });
    el.addEventListener("playing", () => {
      musicLoading = false;
      emitSnapshot();
    });
    el.addEventListener("timeupdate", () => {
      if (audioMode === "recorded") {
        currentTimeSec = el.currentTime || 0;
        if (Number.isFinite(el.duration) && el.duration > 0) {
          durationSec = el.duration;
        }
        emitSnapshot();
      }
    });
    el.addEventListener("ended", () => {
      if (!musicPlaying || audioMode !== "recorded") return;
      if (loopOneEnabled) {
        el.currentTime = 0;
        void el.play().catch(() => {});
        return;
      }
      advanceToNextIndex();
      startChristmasMusic(currentTrackIdx);
    });
    el.addEventListener("error", () => {
      // Seamless automatic fallback to built-in Celesta Music Box if offline or stream blocked
      if (musicPlaying && audioMode === "recorded") {
        musicLoading = false;
        audioMode = "musicbox";
        startSynthPlayback();
        emitSnapshot();
      }
    });

    htmlAudio = el;
  }
  return htmlAudio;
}

function stopSynthPlayback(): void {
  if (schedulerId !== null && typeof window !== "undefined") {
    window.clearInterval(schedulerId);
    schedulerId = null;
  }
  if (sharedCtx && musicBus) {
    try {
      const now = sharedCtx.currentTime;
      musicBus.gain.cancelScheduledValues(now);
      musicBus.gain.setValueAtTime(musicBus.gain.value, now);
      musicBus.gain.linearRampToValueAtTime(0.0001, now + 0.1);
    } catch {
      // Ignore cleanup errors
    }
  }
}

function startSynthPlayback(): boolean {
  const ctx = ensureAudioBuses();
  if (!ctx || !musicBus) return false;
  stopSynthPlayback();
  musicBus.gain.cancelScheduledValues(ctx.currentTime);
  musicBus.gain.setValueAtTime(0.44 * volumeLevel, ctx.currentTime);

  musicPlaying = true;
  musicLoading = false;
  noteIndex = 0;
  synthStartedAt = ctx.currentTime;
  nextNoteTime = ctx.currentTime + 0.04;
  scheduleMusicTick();

  if (typeof window !== "undefined") {
    schedulerId = window.setInterval(scheduleMusicTick, 120);
  }
  emitSnapshot();
  return true;
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

    const track = CHRISTMAS_TRACKS[currentTrackIdx] ?? CHRISTMAS_TRACKS[0];

    if (audioMode === "recorded") {
      stopSynthPlayback();
      const el = ensureHtmlAudio();
      if (el) {
        if (el.src !== track.audioUrl) {
          el.src = track.audioUrl;
          currentTimeSec = 0;
          durationSec = 0;
        }
        el.volume = volumeLevel;
        musicPlaying = true;
        musicLoading = true;
        emitSnapshot();
        void el.play().catch(() => {
          // If network audio cannot play, fall back smoothly to Celesta Music Box
          if (musicPlaying) {
            audioMode = "musicbox";
            startSynthPlayback();
          }
        });
        return true;
      }
    }

    if (htmlAudio) {
      htmlAudio.pause();
    }
    return startSynthPlayback();
  } catch {
    musicPlaying = false;
    musicLoading = false;
    emitSnapshot();
    return false;
  }
}

export function stopChristmasMusic(): void {
  musicPlaying = false;
  musicLoading = false;
  if (htmlAudio) {
    try {
      htmlAudio.pause();
    } catch {
      // Ignore
    }
  }
  stopSynthPlayback();
  emitSnapshot();
}

export function toggleChristmasMusic(): boolean {
  if (musicPlaying) {
    stopChristmasMusic();
    return false;
  }
  return startChristmasMusic(currentTrackIdx);
}

export function nextChristmasTrack(): ChristmasTrack {
  advanceToNextIndex();
  currentTimeSec = 0;
  if (musicPlaying) {
    startChristmasMusic(currentTrackIdx);
  } else {
    if (htmlAudio) {
      htmlAudio.src = getCurrentChristmasTrack().audioUrl;
    }
    emitSnapshot();
  }
  return getCurrentChristmasTrack();
}

export function prevChristmasTrack(): ChristmasTrack {
  if (currentTimeSec > 3 && htmlAudio && audioMode === "recorded") {
    htmlAudio.currentTime = 0;
    currentTimeSec = 0;
    emitSnapshot();
    return getCurrentChristmasTrack();
  }
  currentTrackIdx =
    (currentTrackIdx - 1 + CHRISTMAS_TRACKS.length) % CHRISTMAS_TRACKS.length;
  currentTimeSec = 0;
  if (musicPlaying) {
    startChristmasMusic(currentTrackIdx);
  } else {
    if (htmlAudio) {
      htmlAudio.src = getCurrentChristmasTrack().audioUrl;
    }
    emitSnapshot();
  }
  return getCurrentChristmasTrack();
}

export function selectChristmasTrack(index: number): ChristmasTrack {
  startChristmasMusic(index);
  return getCurrentChristmasTrack();
}

export function seekChristmasMusic(nextTimeSec: number): void {
  if (!Number.isFinite(nextTimeSec) || nextTimeSec < 0) return;
  if (audioMode === "recorded" && htmlAudio) {
    try {
      htmlAudio.currentTime = nextTimeSec;
      currentTimeSec = nextTimeSec;
      emitSnapshot();
    } catch {
      // Ignore unseekable state
    }
  }
}

export function setChristmasVolume(nextVolume: number): void {
  volumeLevel = Math.max(0, Math.min(1, nextVolume));
  if (htmlAudio) {
    htmlAudio.volume = volumeLevel;
  }
  if (sharedCtx && musicBus && musicPlaying && audioMode === "musicbox") {
    musicBus.gain.setValueAtTime(0.44 * volumeLevel, sharedCtx.currentTime);
  }
  emitSnapshot();
}

export function setChristmasShuffle(enabled: boolean): void {
  shuffleEnabled = enabled;
  emitSnapshot();
}

export function setChristmasLoopOne(enabled: boolean): void {
  loopOneEnabled = enabled;
  emitSnapshot();
}

export function setChristmasAudioMode(mode: MusicAudioMode): void {
  if (audioMode === mode) return;
  audioMode = mode;
  if (musicPlaying) {
    startChristmasMusic(currentTrackIdx);
  } else {
    emitSnapshot();
  }
}

/**
 * Creates a clean WebAudio MediaStream playing the current Christmas track's celesta arrangement
 * for embedding crystal-clear holiday audio inside exported HD MP4/WebM videos.
 */
export function createExportHolidayAudioTrack(
  durationMs: number,
  trackIndex = currentTrackIdx,
): { audioTrack: MediaStreamTrack; cleanup: () => void } | null {
  if (typeof window === "undefined") return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) return null;

  try {
    const offlineLiveCtx = new AudioCtx();
    if (typeof offlineLiveCtx.createMediaStreamDestination !== "function") {
      void offlineLiveCtx.close().catch(() => {});
      return null;
    }
    const dest = offlineLiveCtx.createMediaStreamDestination();
    const masterGain = offlineLiveCtx.createGain();
    masterGain.gain.setValueAtTime(0.45, offlineLiveCtx.currentTime);
    masterGain.connect(dest);

    if (offlineLiveCtx.state === "suspended") {
      void offlineLiveCtx.resume().catch(() => {});
    }

    const track = CHRISTMAS_TRACKS[trackIndex] ?? CHRISTMAS_TRACKS[0];
    const secPerBeat = 60 / track.tempoBpm;
    const totalSec = durationMs / 1000;
    let cursor = offlineLiveCtx.currentTime + 0.05;
    let idx = 0;

    while (cursor < offlineLiveCtx.currentTime + totalSec) {
      const [freq, beats] = track.notes[idx % track.notes.length];
      const stepSec = Math.max(0.08, beats * secPerBeat);
      if (freq > 0) {
        triggerCelestaVoice(
          offlineLiveCtx,
          masterGain,
          freq,
          cursor,
          Math.min(1.2, stepSec * 1.3),
          0.14,
        );
        if (beats >= 1.5) {
          triggerCelestaVoice(
            offlineLiveCtx,
            masterGain,
            freq * 0.5,
            cursor,
            Math.min(1.2, stepSec * 1.2),
            0.06,
          );
        }
      }
      cursor += stepSec;
      idx += 1;
    }

    // Gentle fade-out at end of clip
    const fadeStart =
      offlineLiveCtx.currentTime + Math.max(0.2, totalSec - 0.35);
    masterGain.gain.setValueAtTime(0.45, fadeStart);
    masterGain.gain.linearRampToValueAtTime(
      0.0001,
      offlineLiveCtx.currentTime + totalSec,
    );

    const streamTrack = dest.stream.getAudioTracks()[0];
    if (!streamTrack) {
      void offlineLiveCtx.close().catch(() => {});
      return null;
    }

    return {
      audioTrack: streamTrack,
      cleanup: () => {
        try {
          streamTrack.stop();
        } catch {
          // Ignore
        }
        void offlineLiveCtx.close().catch(() => {});
      },
    };
  } catch {
    return null;
  }
}

/**
 * Plays warm winter sound effects synced to user gestures (ornament hang, unwrap, QR morph, UI click).
 */
export function playOrnamentChime(
  kind: "drop" | "open" | "qr" | "click" | "celebrate" | "seal",
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
      seal: {
        freqs: [523.25, 659.25, 783.99, 1046.5],
        spacing: 0.055,
        duration: 0.52,
        gain: 0.05,
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

    if (kind === "drop" || kind === "celebrate" || kind === "seal") {
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
