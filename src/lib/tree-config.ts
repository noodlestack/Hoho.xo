import { isTreeThemeId, type TreeThemeId } from "./tree-themes";

export type TreeTopperId =
  | "star"
  | "diamond"
  | "snowflake"
  | "heart"
  | "crown"
  | "ribbon";

export type TreeShapeId = "classic" | "layered" | "spire" | "wide";
export type TreeSceneryId =
  | "snowfall"
  | "aurora"
  | "starlight"
  | "blizzard"
  | "hearth";

export interface TreeTopperMeta {
  id: TreeTopperId;
  label: string;
  glyph: string;
}

export interface TreeShapeMeta {
  id: TreeShapeId;
  label: string;
  desc: string;
}

export const TREE_TOPPERS: TreeTopperMeta[] = [
  { id: "star", label: "Star", glyph: "★" },
  { id: "diamond", label: "Sparkle", glyph: "✦" },
  { id: "snowflake", label: "Snowflake", glyph: "❄" },
  { id: "heart", label: "Heart", glyph: "♥" },
  { id: "crown", label: "Crown", glyph: "♛" },
  { id: "ribbon", label: "Bow", glyph: "⋈" },
];

export const TREE_SHAPES: TreeShapeMeta[] = [
  { id: "classic", label: "Classic", desc: "Balanced 5-tier cone" },
  { id: "layered", label: "Layered", desc: "Deep stepped boughs" },
  { id: "spire", label: "Spire", desc: "Tall Nordic pine" },
  { id: "wide", label: "Full Pine", desc: "Broad lush canopy" },
];

export const TREE_AVATARS: Array<{ id: string; label: string }> = [
  { id: "", label: "Initial" },
  { id: "★", label: "Star" },
  { id: "❄", label: "Snow" },
  { id: "♡", label: "Heart" },
  { id: "✦", label: "Sparkle" },
  { id: "♛", label: "Crown" },
  { id: "☾", label: "Moon" },
];

export const TREE_SCENERIES: Array<{
  id: TreeSceneryId;
  label: string;
  desc: string;
}> = [
  { id: "snowfall", label: "Snowfall", desc: "Soft drift + floor" },
  { id: "aurora", label: "Aurora", desc: "Northern sky ribbons" },
  { id: "starlight", label: "Starlight", desc: "Moonlit night sky" },
  { id: "blizzard", label: "Blizzard", desc: "Crisp winter gale" },
  { id: "hearth", label: "Hearth", desc: "Warm cabin embers" },
];

export interface TreeConfig {
  handle: string;
  displayName: string;
  avatar: string;
  prompt: string;
  mutedWords: string;
  themeId: TreeThemeId;
  topper: TreeTopperId;
  shape: TreeShapeId;
  scenery: TreeSceneryId;
  showSnow: boolean;
  showGarland: boolean;
  showOrnaments: boolean;
  pauseInbox: boolean;
  christmasLock: boolean;
}

export const OWNER_PROMPT_PRESETS: string[] = [
  "Send me an anonymous note before Christmas 🎄",
  "One honest thing you never told me this year?",
  "Paskong chika o confession—hang it on my tree.",
  "What's your favorite memory with me in 2026?",
  "Drop a song, a wish, or a tiny truth anonymously.",
  "Say it without signing your name. I'll answer on IG.",
  "Anong wishlist mo para sa'kin bago mag-Dec 25?",
  "Leave a little kindness or mild chaos on my tree ✨",
  "Drop a quick 'Kamusta?' or honest note bago mag-New Year.",
  "Bawal ma-shy — isang anonymous wish o confession lang 🎄",
  "Sinong kanta ang pinaka-bagay sa'kin? Drop it anonymously.",
  "Kung may isang bagay ka pang gustong sabihin sa'kin this 2026...",
  "Rate our 2026 friendship or leave a Christmas chika ✨",
  "No names, pure vibes lang — hang a note on my tree!",
];

export const VISITOR_IDEA_PROMPTS: string[] = [
  "I always smile whenever you...",
  "My honest first impression of you was...",
  "Before this year ends, I hope you know...",
  "Thank you for that time when you...",
  "Lowkey miss hanging out when we...",
  "A song that reminds me of you is...",
  "Wish ko lang sa'yo ngayong Pasko...",
  "You probably didn't notice, but...",
];

const CONFIG_STORAGE_PREFIX = "hoho_xo_config_v2";
const ACTIVE_HANDLE_KEY = "hoho_xo_owner_handle_v1";

export const RESERVED_HANDLES = new Set<string>([
  "api",
  "t",
  "admin",
  "www",
  "app",
  "static",
  "health",
  "robots",
  "privacy",
  "terms",
  "support",
  "help",
  "login",
  "settings",
  "about",
  "_next",
  "hoho",
  "hohoxo",
]);

export function parseHandle(raw: string): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  const withoutAt = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
  if (!/^[A-Za-z0-9_]{3,20}$/.test(withoutAt)) return null;
  const candidate = withoutAt.toLowerCase();
  if (RESERVED_HANDLES.has(candidate)) return null;
  return candidate;
}

/**
 * @deprecated Client-side typing preview only. Never use for authorization,
 * routing, or storage keys; use `parseHandle` instead.
 */
export function sanitizeHandle(handle = ""): string {
  return handle
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 20);
}

export function loadActiveOwnerHandle(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ACTIVE_HANDLE_KEY);
    return raw ? parseHandle(raw) : null;
  } catch {
    return null;
  }
}

export function saveActiveOwnerHandle(handle: string): void {
  if (typeof window === "undefined") return;
  const parsed = parseHandle(handle);
  if (!parsed) return;
  try {
    window.localStorage.setItem(ACTIVE_HANDLE_KEY, parsed);
  } catch {
    // Ignore storage errors
  }
}

export function isTreeTopperId(value: unknown): value is TreeTopperId {
  return (
    value === "star" ||
    value === "diamond" ||
    value === "snowflake" ||
    value === "heart" ||
    value === "crown" ||
    value === "ribbon"
  );
}

export function isTreeShapeId(value: unknown): value is TreeShapeId {
  return (
    value === "classic" ||
    value === "layered" ||
    value === "spire" ||
    value === "wide"
  );
}

export function isTreeSceneryId(value: unknown): value is TreeSceneryId {
  return (
    value === "snowfall" ||
    value === "aurora" ||
    value === "starlight" ||
    value === "blizzard" ||
    value === "hearth"
  );
}

export function defaultTreeConfig(handle = ""): TreeConfig {
  const cleanHandle = parseHandle(handle) ?? "";
  return {
    handle: cleanHandle,
    displayName: cleanHandle ? `@${cleanHandle}` : "",
    avatar: "",
    prompt: OWNER_PROMPT_PRESETS[0],
    mutedWords: "",
    themeId: "fairy",
    topper: "star",
    shape: "classic",
    scenery: "snowfall",
    showSnow: true,
    showGarland: true,
    showOrnaments: true,
    pauseInbox: false,
    christmasLock: false,
  };
}

export function loadTreeConfig(handle = ""): TreeConfig {
  const clean = parseHandle(handle) ?? "";
  const fallback = defaultTreeConfig(clean);
  if (typeof window === "undefined" || !clean) return fallback;

  try {
    const raw = window.localStorage.getItem(
      `${CONFIG_STORAGE_PREFIX}:${clean}`,
    );
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return fallback;
    const obj = parsed as Record<string, unknown>;
    const candidateTheme =
      typeof obj.themeId === "string" ? obj.themeId : null;

    return {
      handle: clean,
      displayName:
        typeof obj.displayName === "string" && obj.displayName.trim().length > 0
          ? obj.displayName.trim().slice(0, 40)
          : fallback.displayName,
      avatar:
        typeof obj.avatar === "string" ? obj.avatar.slice(0, 4) : fallback.avatar,
      prompt:
        typeof obj.prompt === "string" && obj.prompt.trim().length > 0
          ? obj.prompt.trim().slice(0, 140)
          : fallback.prompt,
      mutedWords:
        typeof obj.mutedWords === "string"
          ? obj.mutedWords.slice(0, 240)
          : fallback.mutedWords,
      themeId: isTreeThemeId(candidateTheme)
        ? candidateTheme
        : fallback.themeId,
      topper: isTreeTopperId(obj.topper) ? obj.topper : fallback.topper,
      shape: isTreeShapeId(obj.shape) ? obj.shape : fallback.shape,
      scenery: isTreeSceneryId(obj.scenery) ? obj.scenery : fallback.scenery,
      showSnow:
        typeof obj.showSnow === "boolean" ? obj.showSnow : fallback.showSnow,
      showGarland:
        typeof obj.showGarland === "boolean"
          ? obj.showGarland
          : fallback.showGarland,
      showOrnaments:
        typeof obj.showOrnaments === "boolean"
          ? obj.showOrnaments
          : fallback.showOrnaments,
      pauseInbox:
        typeof obj.pauseInbox === "boolean"
          ? obj.pauseInbox
          : fallback.pauseInbox,
      christmasLock:
        typeof obj.christmasLock === "boolean"
          ? obj.christmasLock
          : fallback.christmasLock,
    };
  } catch {
    return fallback;
  }
}

export function saveTreeConfig(handle: string, config: TreeConfig): void {
  if (typeof window === "undefined") return;
  const clean = parseHandle(handle);
  if (!clean) return;
  try {
    window.localStorage.setItem(
      `${CONFIG_STORAGE_PREFIX}:${clean}`,
      JSON.stringify({ ...config, handle: clean }),
    );
  } catch {
    // Ignore storage quota errors gracefully
  }
}

/**
 * Encodes the customized tree design into the visitor URL so scanning the QR
 * code lands directly on the exact theme, topper, silhouette, and prompt.
 * Default values are omitted to keep the QR code fast and easy to scan.
 */
export function buildDesignShareUrl(
  origin: string,
  handle: string,
  config: TreeConfig,
  options?: { short?: boolean },
): string {
  const cleanHandle = parseHandle(handle) ?? "";
  if (!cleanHandle) {
    return new URL("/", origin).toString();
  }
  const url = new URL(`/t/${cleanHandle}`, origin);
  if (options?.short) {
    return url.toString();
  }
  const defaults = defaultTreeConfig(cleanHandle);

  url.searchParams.set("tree", config.themeId);
  if (config.topper !== defaults.topper) {
    url.searchParams.set("topper", config.topper);
  }
  if (config.shape !== defaults.shape) {
    url.searchParams.set("shape", config.shape);
  }
  if (config.scenery !== defaults.scenery) {
    url.searchParams.set("sc", config.scenery);
  }
  if (config.displayName.trim() && config.displayName.trim() !== defaults.displayName) {
    url.searchParams.set("n", config.displayName.trim().slice(0, 40));
  }
  if (config.avatar) {
    url.searchParams.set("a", config.avatar);
  }
  if (config.prompt.trim() && config.prompt.trim() !== defaults.prompt) {
    url.searchParams.set("p", config.prompt.trim().slice(0, 120));
  }
  if (!config.showSnow) url.searchParams.set("s", "0");
  if (!config.showGarland) url.searchParams.set("g", "0");
  if (!config.showOrnaments) url.searchParams.set("o", "0");
  if (config.pauseInbox) url.searchParams.set("pause", "1");

  return url.toString();
}

export function parseDesignFromSearchParams(
  params: URLSearchParams,
  fallback: TreeConfig,
): TreeConfig {
  const next: TreeConfig = { ...fallback };
  const treeParam = params.get("tree");
  const topperParam = params.get("topper");
  const shapeParam = params.get("shape");
  const sceneryParam = params.get("sc");
  const nameParam = params.get("n");
  const avatarParam = params.get("a");
  const promptParam = params.get("p");
  const snowParam = params.get("s");
  const garlandParam = params.get("g");
  const ornamentsParam = params.get("o");
  const pauseParam = params.get("pause");

  if (isTreeThemeId(treeParam)) next.themeId = treeParam;
  if (isTreeTopperId(topperParam)) next.topper = topperParam;
  if (isTreeShapeId(shapeParam)) next.shape = shapeParam;
  if (isTreeSceneryId(sceneryParam)) next.scenery = sceneryParam;
  if (nameParam && nameParam.trim()) next.displayName = nameParam.trim().slice(0, 40);
  if (avatarParam !== null) next.avatar = avatarParam.slice(0, 4);
  if (promptParam && promptParam.trim()) next.prompt = promptParam.trim().slice(0, 140);
  if (snowParam === "0" || snowParam === "1") next.showSnow = snowParam === "1";
  if (garlandParam === "0" || garlandParam === "1") next.showGarland = garlandParam === "1";
  if (ornamentsParam === "0" || ornamentsParam === "1") {
    next.showOrnaments = ornamentsParam === "1";
  }
  if (pauseParam === "1" || pauseParam === "0") next.pauseInbox = pauseParam === "1";

  return next;
}
