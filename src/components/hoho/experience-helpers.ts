import type { TreeMessage } from "@/lib/messages";
import { parseHandle, type TreeConfig } from "@/lib/tree-config";

export type StudioTab = "share" | "style" | "prompt";

export interface ClaimApiResponse {
  ok?: boolean;
  handle?: string;
  created?: boolean;
  ownerKey?: string;
  config?: TreeConfig;
  messages?: TreeMessage[];
  error?: string;
}

export interface PublicTreeApiResponse {
  ok?: boolean;
  handle?: string;
  claimed?: boolean;
  config?: TreeConfig;
  ornaments?: Array<{
    id: string;
    seq: number;
    ornamentType: number;
    colorIdx: number;
    seed: number;
    status: "visible";
    readAt: null;
    createdAt: string;
  }>;
  totalVisible?: number;
}

export interface ClaimOutcome {
  status: number;
  data: ClaimApiResponse;
  usedKey: string;
}

export interface ShortcutItem {
  key: string;
  label: string;
}

const BASE_SHORTCUTS_BEFORE_MODE: readonly ShortcutItem[] = [
  { key: "Q", label: "Toggle QR code" },
  { key: "T", label: "Top-down view" },
];

const BASE_SHORTCUTS_AFTER_MODE: readonly ShortcutItem[] = [
  { key: "← / →", label: "Rotate 3D tree" },
  { key: "Scroll", label: "Zoom / pinch scale" },
];

export function getKeyboardShortcuts(isOwnerMode: boolean): ShortcutItem[] {
  return [
    ...BASE_SHORTCUTS_BEFORE_MODE,
    isOwnerMode
      ? { key: "M", label: "Open Mail drawer" }
      : { key: "N", label: "Focus note composer" },
    ...BASE_SHORTCUTS_AFTER_MODE,
  ];
}

export const DRAFT_STORAGE_PREFIX = "hoho_draft";

export function readVisitorDraft(handle: string): string {
  if (typeof window === "undefined") return "";
  const parsed = parseHandle(handle);
  if (!parsed) return "";
  try {
    return (
      window.sessionStorage.getItem(`${DRAFT_STORAGE_PREFIX}_${parsed}`) ?? ""
    );
  } catch {
    return "";
  }
}

export function writeVisitorDraft(handle: string, draft: string): void {
  if (typeof window === "undefined") return;
  const parsed = parseHandle(handle);
  if (!parsed) return;
  try {
    const key = `${DRAFT_STORAGE_PREFIX}_${parsed}`;
    if (draft.length > 0) {
      window.sessionStorage.setItem(key, draft);
    } else {
      window.sessionStorage.removeItem(key);
    }
  } catch {
    // Ignore storage quota errors cleanly
  }
}
