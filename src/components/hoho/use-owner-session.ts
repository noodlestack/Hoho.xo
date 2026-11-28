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
import { playOrnamentChime } from "@/lib/sound";
import {
  clearActiveOwnerHandle,
  defaultTreeConfig,
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
  soundEnabled: boolean;
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
  soundEnabled,
  seedKnownMessages,
  resetMailTracking,
  showToast,
}: UseOwnerSessionOptions) {
  const [handleDraft, setHandleDraft] = useState<string>(initialSafeHandle);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authChecking, setAuthChecking] = useState<boolean>(isOwnerMode);
  const [authSubmitting, setAuthSubmitting] = useState<boolean>(false);
  const [hasPassword, setHasPassword] = useState<boolean>(true);
  const [ownerKey, setOwnerKey] = useState<string>("");
  const [unlockDraft, setUnlockDraft] = useState<string>("");
  const [ownerClaimError, setOwnerClaimError] = useState<string>("");

  const checkSession = useCallback(
    async (targetHandle: string): Promise<boolean> => {
      const clean = parseHandle(targetHandle);
      if (!isOwnerMode || !clean) {
        setAuthChecking(false);
        return false;
      }
      try {
        const res = await fetch("/api/trees", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ handle: clean, mode: "session" }),
        });
        const data = (await res.json().catch(() => ({}))) as ClaimApiResponse;
        if (res.ok && data.ok && data.authenticated) {
          setIsAuthenticated(true);
          setServerSynced(true);
          setHasPassword(Boolean(data.hasPassword));
          setOwnerClaimError("");
          setActiveHandle(clean);
          setHandleDraft(clean);
          if (data.config) {
            setConfig(data.config);
            saveTreeConfig(clean, data.config);
          }
          if (Array.isArray(data.messages)) {
            seedKnownMessages(data.messages);
            setMessages(data.messages);
            saveStoredMessages(data.messages, clean);
          }
          return true;
        }
        setIsAuthenticated(false);
        setServerSynced(false);
        return false;
      } catch {
        setServerSynced(false);
        return false;
      } finally {
        setAuthChecking(false);
      }
    },
    [
      isOwnerMode,
      seedKnownMessages,
      setActiveHandle,
      setConfig,
      setMessages,
      setServerSynced,
    ],
  );

  const registerTreeAccount = useCallback(
    async (input: {
      handle: string;
      displayName: string;
      password: string;
      configOverride?: Partial<TreeConfig>;
    }): Promise<boolean> => {
      const clean = parseHandle(input.handle);
      if (!clean) {
        setOwnerClaimError(
          "Handles use 3–20 letters, numbers, or underscores.",
        );
        return false;
      }
      if (input.password.trim().length < 6) {
        setOwnerClaimError("Choose a password with at least 6 characters.");
        return false;
      }

      setAuthSubmitting(true);
      setOwnerClaimError("");
      try {
        const nextCfg: TreeConfig = {
          ...defaultTreeConfig(clean),
          ...config,
          ...(input.configOverride ?? {}),
          handle: clean,
          displayName: input.displayName.trim() || `@${clean}`,
        };

        const res = await fetch("/api/trees", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            handle: clean,
            mode: "register",
            password: input.password.trim(),
            config: nextCfg,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as ClaimApiResponse;
        if (!res.ok || !data.ok) {
          setOwnerClaimError(
            data.error ?? "Could not create your tree right now.",
          );
          return false;
        }

        const savedCfg = data.config ?? nextCfg;
        resetMailTracking();
        setActiveHandle(clean);
        setHandleDraft(clean);
        setConfig(savedCfg);
        setMessages(data.messages ?? []);
        seedKnownMessages(data.messages ?? []);
        saveActiveOwnerHandle(clean);
        saveTreeConfig(clean, savedCfg);
        saveStoredMessages(data.messages ?? [], clean);
        setHasPassword(true);
        setIsAuthenticated(true);
        setServerSynced(true);
        setOwnerClaimError("");
        if (soundEnabled) playOrnamentChime("celebrate");
        showToast(`Tree @${clean} is live! Share your link or QR.`);
        return true;
      } catch {
        setOwnerClaimError("Network error — please try again.");
        return false;
      } finally {
        setAuthSubmitting(false);
      }
    },
    [
      config,
      resetMailTracking,
      seedKnownMessages,
      setActiveHandle,
      setConfig,
      setMessages,
      setServerSynced,
      showToast,
      soundEnabled,
    ],
  );

  const loginTreeAccount = useCallback(
    async (input: { handle: string; password: string }): Promise<boolean> => {
      const clean = parseHandle(input.handle);
      if (!clean) {
        setOwnerClaimError(
          "Enter a valid handle (3–20 letters, numbers, or underscores).",
        );
        return false;
      }
      if (!input.password.trim()) {
        setOwnerClaimError("Enter your password to log in.");
        return false;
      }

      setAuthSubmitting(true);
      setOwnerClaimError("");
      try {
        const res = await fetch("/api/trees", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            handle: clean,
            mode: "login",
            password: input.password.trim(),
          }),
        });
        const data = (await res.json().catch(() => ({}))) as ClaimApiResponse;
        if (!res.ok || !data.ok) {
          setOwnerClaimError(
            data.error ?? "Invalid handle or password. Please try again.",
          );
          return false;
        }

        const savedCfg = data.config ?? defaultTreeConfig(clean);
        resetMailTracking();
        setActiveHandle(clean);
        setHandleDraft(clean);
        setConfig(savedCfg);
        const list = Array.isArray(data.messages) ? data.messages : [];
        seedKnownMessages(list);
        setMessages(list);
        saveActiveOwnerHandle(clean);
        saveTreeConfig(clean, savedCfg);
        saveStoredMessages(list, clean);
        setHasPassword(Boolean(data.hasPassword));
        setIsAuthenticated(true);
        setServerSynced(true);
        setOwnerClaimError("");
        if (soundEnabled) playOrnamentChime("open");
        showToast(`Welcome back, ${savedCfg.displayName || `@${clean}`}!`);
        return true;
      } catch {
        setOwnerClaimError("Network error — please try again.");
        return false;
      } finally {
        setAuthSubmitting(false);
      }
    },
    [
      resetMailTracking,
      seedKnownMessages,
      setActiveHandle,
      setConfig,
      setMessages,
      setServerSynced,
      showToast,
      soundEnabled,
    ],
  );

  const logoutOwner = useCallback(async () => {
    const prevHandle = activeHandle;
    clearActiveOwnerHandle();
    resetMailTracking();
    setIsAuthenticated(false);
    setServerSynced(false);
    setActiveHandle("");
    setMessages([]);
    setOwnerKey("");
    setOwnerClaimError("");
    if (prevHandle) {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: prevHandle }),
      }).catch(() => {});
    }
    showToast("Signed out of your tree", "info");
  }, [
    activeHandle,
    resetMailTracking,
    setActiveHandle,
    setMessages,
    setServerSynced,
    showToast,
  ]);

  const updateOwnerPassword = useCallback(
    async (newPassword: string): Promise<boolean> => {
      const clean = parseHandle(activeHandle);
      if (!clean) return false;
      if (newPassword.trim().length < 6) {
        showToast("Password must be at least 6 characters.", "error");
        return false;
      }
      try {
        const res = await fetch("/api/trees", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            handle: clean,
            newPassword: newPassword.trim(),
          }),
        });
        const data = (await res.json().catch(() => ({}))) as ClaimApiResponse;
        if (!res.ok || !data.ok) {
          showToast(data.error ?? "Could not update password.", "error");
          return false;
        }
        setHasPassword(true);
        showToast("Account password updated!");
        return true;
      } catch {
        showToast("Network error updating password.", "error");
        return false;
      }
    },
    [activeHandle, showToast],
  );

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
              headers: { "Content-Type": "application/json" },
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
              `@${targetHandle} is already taken. Log in with your password or choose another handle.`,
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

        setHasPassword(Boolean(data.hasPassword));
        setIsAuthenticated(true);
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
      if (nextHandle === activeHandle && isAuthenticated) return;

      const sessionOk = await checkSession(nextHandle);
      if (sessionOk) {
        saveActiveOwnerHandle(nextHandle);
        showToast(`Switched to @${nextHandle}`);
        return;
      }

      setOwnerClaimError(
        `Log in with the password for @${nextHandle} or create a new tree.`,
      );
      setIsAuthenticated(false);
    },
    [activeHandle, checkSession, isAuthenticated, isOwnerMode, showToast],
  );

  const handleUnlockWithKey = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      const targetHandle =
        parseHandle(activeHandle) ?? parseHandle(handleDraft);
      if (!targetHandle) {
        showToast("Enter a valid handle first.", "error");
        return;
      }
      const cleanedKey = unlockDraft.trim();
      if (!cleanedKey) return;
      const ok = await loginTreeAccount({
        handle: targetHandle,
        password: cleanedKey,
      });
      if (ok) {
        setUnlockDraft("");
      }
    },
    [activeHandle, handleDraft, loginTreeAccount, showToast, unlockDraft],
  );

  return {
    handleDraft,
    setHandleDraft,
    isAuthenticated,
    setIsAuthenticated,
    authChecking,
    setAuthChecking,
    authSubmitting,
    hasPassword,
    ownerKey,
    setOwnerKey,
    unlockDraft,
    setUnlockDraft,
    ownerClaimError,
    setOwnerClaimError,
    checkSession,
    registerTreeAccount,
    loginTreeAccount,
    logoutOwner,
    updateOwnerPassword,
    claimOrSyncOwner,
    commitHandleChange,
    handleUnlockWithKey,
  };
}
