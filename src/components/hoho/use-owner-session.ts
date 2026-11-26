import {
  useCallback,
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";
import {
  type ClaimApiResponse,
  type ClaimOutcome,
} from "@/components/hoho/experience-helpers";
import { saveStoredMessages, type TreeMessage } from "@/lib/messages";
import {
  parseHandle,
  saveActiveOwnerHandle,
  saveTreeConfig,
  type TreeConfig,
} from "@/lib/tree-config";

const inflightClaims = new Map<string, Promise<ClaimOutcome>>();

export interface UseOwnerSessionOptions {
  isOwnerMode: boolean;
  initialSafeHandle: string;
  activeHandle: string;
  setActiveHandle: Dispatch<SetStateAction<string>>;
  config: TreeConfig;
  setConfig: Dispatch<SetStateAction<TreeConfig>>;
  setMessages: Dispatch<SetStateAction<TreeMessage[]>>;
  setServerSynced: Dispatch<SetStateAction<boolean>>;
  seedKnownMessages: (list: TreeMessage[]) => void;
  resetMailTracking: () => void;
  showToast: (message: string, variant?: "success" | "info" | "error") => void;
}

export function useOwnerSession({
  isOwnerMode,
  initialSafeHandle,
  activeHandle,
  setActiveHandle,
  config,
  setConfig,
  setMessages,
  setServerSynced,
  seedKnownMessages,
  resetMailTracking,
  showToast,
}: UseOwnerSessionOptions) {
  const [handleDraft, setHandleDraft] = useState<string>(initialSafeHandle);
  const [ownerKey, setOwnerKey] = useState<string>("");
  const [unlockDraft, setUnlockDraft] = useState<string>("");
  const [ownerClaimError, setOwnerClaimError] = useState<string>("");

  const claimOrSyncOwner = useCallback(
    async (
      targetHandle: string,
      explicitKey?: string,
      seedConfig?: TreeConfig,
    ): Promise<boolean> => {
      if (!isOwnerMode || !parseHandle(targetHandle)) return false;
      const providedKey = explicitKey?.trim() ?? "";
      const dedupeKey = `${targetHandle}:${providedKey || "cookie"}`;

      try {
        let pending = inflightClaims.get(dedupeKey);
        if (!pending) {
          pending = (async () => {
            const res = await fetch("/api/trees", {
              method: "POST",
              credentials: "same-origin",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                handle: targetHandle,
                ...(providedKey ? { ownerKey: providedKey } : {}),
                ...(seedConfig ? { config: seedConfig } : {}),
              }),
            });
            const data = (await res
              .json()
              .catch(() => ({}))) as ClaimApiResponse;
            return { status: res.status, data, usedKey: providedKey };
          })().finally(() => {
            inflightClaims.delete(dedupeKey);
          });
          inflightClaims.set(dedupeKey, pending);
        }

        const { status, data } = await pending;
        if (status === 409) {
          setServerSynced(false);
          setOwnerKey("");
          setOwnerClaimError(
            data.error ??
              `@${targetHandle} is claimed on another device. Enter its Owner Key or choose a new handle.`,
          );
          return false;
        }

        if (status < 200 || status >= 300 || !data.ok) {
          setServerSynced(false);
          return false;
        }

        if (data.created && data.ownerKey) {
          setOwnerKey(data.ownerKey);
        } else {
          setOwnerKey("");
        }

        setOwnerClaimError("");
        setServerSynced(true);

        if (data.config) {
          setConfig(data.config);
          saveTreeConfig(targetHandle, data.config);
        }
        if (Array.isArray(data.messages)) {
          seedKnownMessages(data.messages);
          setMessages(data.messages);
          saveStoredMessages(data.messages, targetHandle);
        }
        return true;
      } catch {
        setServerSynced(false);
        return false;
      }
    },
    [isOwnerMode, seedKnownMessages, setConfig, setMessages, setServerSynced],
  );

  const commitHandleChange = useCallback(
    async (rawValue: string) => {
      if (!isOwnerMode) return;
      const nextHandle = parseHandle(rawValue);
      if (!nextHandle) {
        showToast(
          "Handles use 3–20 letters, numbers, or underscores.",
          "error",
        );
        return;
      }
      setHandleDraft(nextHandle);
      if (nextHandle === activeHandle) return;

      const localFallbackCfg: TreeConfig = { ...config, handle: nextHandle };
      resetMailTracking();
      saveActiveOwnerHandle(nextHandle);
      saveTreeConfig(nextHandle, localFallbackCfg);
      setActiveHandle(nextHandle);
      setConfig(localFallbackCfg);
      setOwnerKey("");

      const ok = await claimOrSyncOwner(
        nextHandle,
        undefined,
        localFallbackCfg,
      );
      if (ok) {
        showToast(`Active handle set to @${nextHandle}`);
      } else {
        showToast(`@${nextHandle} requires its Owner Access Key`);
      }
    },
    [
      activeHandle,
      claimOrSyncOwner,
      config,
      isOwnerMode,
      resetMailTracking,
      setActiveHandle,
      setConfig,
      showToast,
    ],
  );

  const handleUnlockWithKey = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      const targetHandle = parseHandle(activeHandle) ?? parseHandle(handleDraft);
      if (!targetHandle) {
        showToast("Enter a valid handle first.", "error");
        return;
      }
      const cleanedKey = unlockDraft.trim();
      if (!cleanedKey) return;
      const ok = await claimOrSyncOwner(targetHandle, cleanedKey);
      if (ok) {
        setUnlockDraft("");
        showToast(`Unlocked @${targetHandle} Mail & settings`);
      } else {
        showToast("Invalid Owner Access Key for this handle", "error");
      }
    },
    [activeHandle, claimOrSyncOwner, handleDraft, showToast, unlockDraft],
  );

  return {
    handleDraft,
    setHandleDraft,
    ownerKey,
    setOwnerKey,
    unlockDraft,
    setUnlockDraft,
    ownerClaimError,
    claimOrSyncOwner,
    commitHandleChange,
    handleUnlockWithKey,
  };
}
