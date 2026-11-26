import {
  useEffect,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import type { CameraViewMode } from "@/components/ascii-tree-canvas";

export interface UseKeyboardShortcutsOptions {
  isOwnerMode: boolean;
  setViewMode: Dispatch<SetStateAction<CameraViewMode>>;
  setMailOpen: Dispatch<SetStateAction<boolean>>;
  setShortcutsOpen: Dispatch<SetStateAction<boolean>>;
  visitorCardRef: RefObject<HTMLElement | null>;
  visitorInputRef: RefObject<HTMLTextAreaElement | null>;
}

export function useKeyboardShortcuts({
  isOwnerMode,
  setViewMode,
  setMailOpen,
  setShortcutsOpen,
  visitorCardRef,
  visitorInputRef,
}: UseKeyboardShortcutsOptions): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target?.isContentEditable ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === "q") {
        setViewMode((prev) => (prev === "qr" ? "tree" : "qr"));
      } else if (key === "t") {
        setViewMode((prev) => (prev === "top" ? "tree" : "top"));
      } else if (key === "m" && isOwnerMode) {
        setMailOpen((prev) => !prev);
      } else if (key === "n" && !isOwnerMode) {
        visitorCardRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
        window.setTimeout(() => visitorInputRef.current?.focus(), 140);
      } else if (event.key === "?") {
        setShortcutsOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    isOwnerMode,
    setMailOpen,
    setShortcutsOpen,
    setViewMode,
    visitorCardRef,
    visitorInputRef,
  ]);
}
