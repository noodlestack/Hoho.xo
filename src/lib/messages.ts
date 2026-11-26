export type MessageStatus = "visible" | "reported";

export type ReportReason =
  | "harassment"
  | "threat"
  | "sexual"
  | "spam"
  | "self_harm"
  | "other";

export interface TreeMessage {
  id: string;
  seq: number;
  body: string;
  ornamentType: number;
  colorIdx: number;
  seed: number;
  status: MessageStatus;
  readAt: string | null;
  createdAt: string;
  reportReason?: ReportReason;
}

export interface ModerationResult {
  decision: "allow" | "reject";
  reason?: string;
  selfHarmNotice?: boolean;
}

const STORAGE_KEY_PREFIX = "hoho_xo_messages_v2";

function getStorageKey(handle = "noodlestack"): string {
  const safe =
    handle
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 20) || "noodlestack";
  return `${STORAGE_KEY_PREFIX}:${safe}`;
}

const BLOCK_PATTERNS: RegExp[] = [
  /https?:\/\//i,
  /\b(?:www\.)?[a-z0-9-]+\.(?:com|net|org|io|app|ph|gg|xyz|co|me|ly|link)\b/i,
  /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i,
  /(?:\+?\d[\d\s\-().]{7,}\d)/,
  /\b(?:kys|kill yourself|go die|doxx|swatting)\b/i,
];

const SELF_HARM_PATTERNS: RegExp[] = [
  /\b(?:suicide|self harm|self-harm|end my life|hurt myself|want to die)\b/i,
];

/**
 * Normalizes user text for moderation comparison only (NFKC, lowercase, strip
 * zero-width characters & diacritics, collapse 3+ repeats, map basic leetspeak).
 */
export function normalizeForModeration(input: string): string {
  const nfkc = input.normalize("NFKC").toLowerCase();
  const withoutZeroWidth = nfkc.replace(/[\u200B-\u200D\uFEFF\u00AD]/g, "");
  const withoutDiacritics = withoutZeroWidth
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const collapsed = withoutDiacritics.replace(/(.)\1{2,}/g, "$1$1");
  const mapped = collapsed
    .replace(/4/g, "a")
    .replace(/3/g, "e")
    .replace(/1/g, "i")
    .replace(/0/g, "o")
    .replace(/5/g, "s")
    .replace(/@/g, "a")
    .replace(/\$/g, "s");

  return mapped.replace(/\s+/g, " ").trim();
}

export function classifyMessage(
  rawBody: string,
  mutedWordsCsv = "",
): ModerationResult {
  const trimmed = rawBody.trim();
  if (trimmed.length === 0) {
    return { decision: "reject", reason: "Write a short note first." };
  }
  if (trimmed.length > 500) {
    return { decision: "reject", reason: "Keep notes within 500 characters." };
  }

  for (const pattern of BLOCK_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        decision: "reject",
        reason:
          "Links, phone numbers, email addresses, and harmful content are blocked for safety.",
      };
    }
  }

  const normalized = normalizeForModeration(trimmed);
  for (const pattern of BLOCK_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        decision: "reject",
        reason:
          "Links, phone numbers, email addresses, and harmful content are blocked for safety.",
      };
    }
  }

  if (mutedWordsCsv.trim().length > 0) {
    const tokens = mutedWordsCsv
      .split(",")
      .map((w) => normalizeForModeration(w))
      .filter((w) => w.length >= 2);
    for (const word of tokens) {
      if (normalized.includes(word)) {
        return {
          decision: "reject",
          reason:
            "This note includes a word filtered by the tree owner. Please rephrase.",
        };
      }
    }
  }

  const selfHarmNotice = SELF_HARM_PATTERNS.some(
    (p) => p.test(trimmed) || p.test(normalized),
  );

  return {
    decision: "allow",
    selfHarmNotice,
  };
}

function randomInt(maxExclusive: number): number {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.getRandomValues === "function"
  ) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return arr[0] % maxExclusive;
  }
  return Math.floor(Math.random() * maxExclusive);
}

export function createMessageRecord(params: {
  body: string;
  ornamentType: number | null;
  nextSeq: number;
}): TreeMessage {
  const chosenType =
    params.ornamentType === null
      ? randomInt(16)
      : Math.max(0, Math.min(15, Math.floor(params.ornamentType)));

  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `msg-${Date.now()}-${randomInt(100000)}`;

  return {
    id,
    seq: params.nextSeq,
    body: params.body.trim(),
    ornamentType: chosenType,
    colorIdx: randomInt(10),
    seed: randomInt(999999) + 1,
    status: "visible",
    readAt: null,
    createdAt: new Date().toISOString(),
  };
}

export function loadStoredMessages(handle = "noodlestack"): TreeMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(getStorageKey(handle));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is TreeMessage => {
      if (!item || typeof item !== "object") return false;
      const obj = item as Record<string, unknown>;
      return (
        typeof obj.id === "string" &&
        typeof obj.seq === "number" &&
        typeof obj.body === "string" &&
        typeof obj.ornamentType === "number" &&
        typeof obj.colorIdx === "number" &&
        typeof obj.seed === "number" &&
        (obj.status === "visible" || obj.status === "reported") &&
        typeof obj.createdAt === "string"
      );
    });
  } catch {
    return [];
  }
}

export function saveStoredMessages(
  messages: TreeMessage[],
  handle = "noodlestack",
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      getStorageKey(handle),
      JSON.stringify(messages),
    );
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function formatRelativeTime(isoDate: string): string {
  const ts = Date.parse(isoDate);
  if (Number.isNaN(ts)) return "just now";
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return "just now";
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
