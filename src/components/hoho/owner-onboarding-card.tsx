"use client";

import {
  ArrowLeft,
  ArrowRight,
  Dices,
  Eye,
  EyeOff,
  Lock,
  LogIn,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import {
  OWNER_PROMPT_PRESETS,
  parseHandle,
  sanitizeHandle,
  type TreeConfig,
} from "@/lib/tree-config";
import { TREE_THEME_LIST } from "@/lib/tree-themes";

export interface OwnerOnboardingCardProps {
  idPrefix?: string;
  initialHandle?: string;
  config: TreeConfig;
  origin: string;
  authSubmitting: boolean;
  authError: string;
  clearAuthError: () => void;
  onHandleDraftChange?: (handle: string) => void;
  onPreviewConfigChange: (patch: Partial<TreeConfig>) => void;
  onRegister: (input: {
    handle: string;
    displayName: string;
    password: string;
    configOverride?: Partial<TreeConfig>;
  }) => Promise<boolean>;
  onLogin: (input: { handle: string; password: string }) => Promise<boolean>;
}

/** Guided 2-step tree creation and password login card replacing raw Owner Access Keys. */
export function OwnerOnboardingCard({
  idPrefix = "owner-",
  initialHandle = "",
  config,
  origin,
  authSubmitting,
  authError,
  clearAuthError,
  onHandleDraftChange,
  onPreviewConfigChange,
  onRegister,
  onLogin,
}: OwnerOnboardingCardProps) {
  const [authTab, setAuthTab] = useState<"create" | "login">(
    initialHandle ? "login" : "create",
  );
  const [step, setStep] = useState<1 | 2>(1);
  const [displayName, setDisplayName] = useState<string>(
    config.displayName && !config.displayName.startsWith("@")
      ? config.displayName
      : "",
  );
  const [handleInput, setHandleInput] = useState<string>(initialHandle);
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [promptIdx, setPromptIdx] = useState<number>(0);
  const [localHint, setLocalHint] = useState<string>("");

  const cleanHandle = parseHandle(handleInput);
  const previewHost = (origin || "https://hoho-xo.vercel.app").replace(
    /^https?:\/\//i,
    "",
  );

  function switchAuthTab(next: "create" | "login") {
    setAuthTab(next);
    setStep(1);
    setLocalHint("");
    clearAuthError();
  }

  function handleStepOneNext(event: FormEvent) {
    event.preventDefault();
    setLocalHint("");
    clearAuthError();
    if (!cleanHandle) {
      setLocalHint(
        "Pick a handle using 3–20 letters, numbers, or underscores.",
      );
      return;
    }
    if (password.trim().length < 6) {
      setLocalHint("Choose a password with at least 6 characters.");
      return;
    }
    onPreviewConfigChange({
      displayName: displayName.trim() || `@${cleanHandle}`,
    });
    setStep(2);
  }

  async function handleCreateSubmit(event: FormEvent) {
    event.preventDefault();
    if (!cleanHandle) {
      setStep(1);
      return;
    }
    await onRegister({
      handle: cleanHandle,
      displayName: displayName.trim() || `@${cleanHandle}`,
      password,
      configOverride: {
        themeId: config.themeId,
        prompt: config.prompt,
      },
    });
  }

  async function handleLoginSubmit(event: FormEvent) {
    event.preventDefault();
    setLocalHint("");
    clearAuthError();
    if (!cleanHandle) {
      setLocalHint("Enter your @handle first.");
      return;
    }
    if (!password.trim()) {
      setLocalHint("Enter your password to log in.");
      return;
    }
    await onLogin({ handle: cleanHandle, password });
  }

  function cycleGreetingPrompt() {
    const nextIdx = (promptIdx + 1) % OWNER_PROMPT_PRESETS.length;
    setPromptIdx(nextIdx);
    onPreviewConfigChange({ prompt: OWNER_PROMPT_PRESETS[nextIdx] });
  }

  return (
    <div className="onboarding-flow">
      <div className="onboarding-hero">
        <span className="onboarding-badge">
          <Sparkles size={13} strokeWidth={2.2} aria-hidden="true" />
          <span>Holiday Tree &amp; Secret Letters</span>
        </span>
        <h1 className="onboarding-title">
          {authTab === "create"
            ? step === 1
              ? "Plant your holiday tree"
              : "Style your tree & greeting"
            : "Welcome back to your tree"}
        </h1>
        <p className="onboarding-subtitle">
          {authTab === "create"
            ? step === 1
              ? "Share one link or QR code. Friends send anonymous letters that hang on your 3D tree and unfold like real mail."
              : "Tap a theme to preview your live 3D tree, then set the question friends see when they scan your QR."
            : "Sign in with your @handle and password to unwrap your letters, customize your tree, or export HD keepsakes."}
        </p>
      </div>

      <div
        className="auth-mode-tabs"
        role="tablist"
        aria-label="Account access"
      >
        <span
          className="auth-mode-indicator"
          aria-hidden="true"
          style={{
            transform: `translateX(${authTab === "create" ? 0 : 100}%)`,
          }}
        />
        <button
          type="button"
          role="tab"
          aria-selected={authTab === "create"}
          className="auth-mode-tab"
          onClick={() => switchAuthTab("create")}
        >
          <UserPlus size={14} strokeWidth={2.1} aria-hidden="true" />
          <span>Create My Tree</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={authTab === "login"}
          className="auth-mode-tab"
          onClick={() => switchAuthTab("login")}
        >
          <LogIn size={14} strokeWidth={2.1} aria-hidden="true" />
          <span>Log In</span>
        </button>
      </div>

      {authError || localHint ? (
        <div className="error-box" role="alert">
          {authError || localHint}
        </div>
      ) : null}

      {authTab === "create" ? (
        step === 1 ? (
          <form className="onboarding-form" onSubmit={handleStepOneNext}>
            <div className="onboarding-step-row">
              <span className="onboarding-step-pill">
                Step 1 of 2 · Account
              </span>
              <span className="onboarding-step-note">
                Free · No email needed
              </span>
            </div>

            <div className="edit-field">
              <label
                htmlFor={`${idPrefix}setup-name`}
                className="section-label"
              >
                Your display name
              </label>
              <input
                id={`${idPrefix}setup-name`}
                type="text"
                className="social-input"
                placeholder="e.g. Mia or Mia's Holiday Tree"
                maxLength={32}
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  onPreviewConfigChange({
                    displayName: e.target.value || `@${cleanHandle ?? "you"}`,
                  });
                }}
              />
            </div>

            <div className="edit-field">
              <label
                htmlFor={`${idPrefix}handle-input`}
                className="section-label"
              >
                Choose your @handle
              </label>
              <div className="handle-prefix-wrap">
                <span className="handle-at-prefix" aria-hidden="true">
                  @
                </span>
                <input
                  id={`${idPrefix}handle-input`}
                  type="text"
                  className="social-input has-at-prefix is-mono"
                  placeholder="mia_2026"
                  maxLength={20}
                  autoCapitalize="none"
                  autoCorrect="off"
                  value={handleInput}
                  onChange={(e) => {
                    const sanitized = sanitizeHandle(e.target.value);
                    setHandleInput(sanitized);
                    onHandleDraftChange?.(sanitized);
                    if (localHint) setLocalHint("");
                    clearAuthError();
                  }}
                />
              </div>
              <p className="onboarding-url-preview">
                Friends message you at:{" "}
                <strong>
                  {previewHost}/t/{cleanHandle ?? "your_handle"}
                </strong>
              </p>
            </div>

            <div className="edit-field">
              <label
                htmlFor={`${idPrefix}password-input`}
                className="section-label"
              >
                Create a password (min 6 characters)
              </label>
              <div className="password-field-wrap">
                <Lock
                  size={15}
                  strokeWidth={2}
                  className="password-field-icon"
                  aria-hidden="true"
                />
                <input
                  id={`${idPrefix}password-input`}
                  type={showPassword ? "text" : "password"}
                  className="social-input has-leading-icon has-trailing-btn"
                  placeholder="Keep your letters private"
                  minLength={6}
                  maxLength={128}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (localHint) setLocalHint("");
                    clearAuthError();
                  }}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? (
                    <EyeOff size={15} strokeWidth={2} aria-hidden="true" />
                  ) : (
                    <Eye size={15} strokeWidth={2} aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <button type="submit" className="primary-btn">
              <span>Continue to Tree Style</span>
              <ArrowRight size={15} strokeWidth={2.2} aria-hidden="true" />
            </button>
          </form>
        ) : (
          <form
            className="onboarding-form"
            onSubmit={(e) => void handleCreateSubmit(e)}
          >
            <div className="onboarding-step-row">
              <button
                type="button"
                className="step-back-link"
                onClick={() => setStep(1)}
              >
                <ArrowLeft size={14} strokeWidth={2.2} aria-hidden="true" />
                <span>Back</span>
              </button>
              <span className="onboarding-step-pill">
                Step 2 of 2 · @{cleanHandle}
              </span>
            </div>

            <div>
              <span className="section-label">Pick your tree theme</span>
              <div
                className="theme-grid"
                role="group"
                aria-label="Tree color theme"
              >
                {TREE_THEME_LIST.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="theme-swatch-btn"
                    aria-pressed={config.themeId === item.id}
                    onClick={() => onPreviewConfigChange({ themeId: item.id })}
                  >
                    <span
                      className="theme-dot"
                      style={
                        {
                          "--swatch-color": item.swatch,
                          backgroundColor: item.swatch,
                        } as React.CSSProperties
                      }
                      aria-hidden="true"
                    />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="edit-field">
              <div className="prompt-header-row">
                <label
                  htmlFor={`${idPrefix}setup-prompt`}
                  className="section-label m-0"
                >
                  Your holiday prompt
                </label>
                <button
                  type="button"
                  className="dice-btn"
                  aria-label="Randomize prompt"
                  onClick={cycleGreetingPrompt}
                >
                  <Dices size={14} strokeWidth={2} aria-hidden="true" />
                  <span>Randomize</span>
                </button>
              </div>
              <textarea
                id={`${idPrefix}setup-prompt`}
                className="edit-textarea"
                maxLength={140}
                value={config.prompt}
                onChange={(e) =>
                  onPreviewConfigChange({ prompt: e.target.value })
                }
              />
            </div>

            <button
              type="submit"
              className="primary-btn"
              disabled={authSubmitting}
            >
              <Sparkles size={15} strokeWidth={2.2} aria-hidden="true" />
              <span>
                {authSubmitting
                  ? "Planting your tree..."
                  : "Create Tree & Get My QR"}
              </span>
            </button>
          </form>
        )
      ) : (
        <form
          className="onboarding-form"
          onSubmit={(e) => void handleLoginSubmit(e)}
        >
          <div className="edit-field">
            <label
              htmlFor={`${idPrefix}login-handle`}
              className="section-label"
            >
              Your tree @handle
            </label>
            <div className="handle-prefix-wrap">
              <span className="handle-at-prefix" aria-hidden="true">
                @
              </span>
              <input
                id={`${idPrefix}login-handle`}
                type="text"
                className="social-input has-at-prefix is-mono"
                placeholder="your_handle"
                maxLength={20}
                autoCapitalize="none"
                autoCorrect="off"
                value={handleInput}
                onChange={(e) => {
                  setHandleInput(sanitizeHandle(e.target.value));
                  if (localHint) setLocalHint("");
                  clearAuthError();
                }}
              />
            </div>
          </div>

          <div className="edit-field">
            <label
              htmlFor={`${idPrefix}login-password`}
              className="section-label"
            >
              Password
            </label>
            <div className="password-field-wrap">
              <Lock
                size={15}
                strokeWidth={2}
                className="password-field-icon"
                aria-hidden="true"
              />
              <input
                id={`${idPrefix}login-password`}
                type={showPassword ? "text" : "password"}
                className="social-input has-leading-icon has-trailing-btn"
                placeholder="Enter your password"
                maxLength={128}
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (localHint) setLocalHint("");
                  clearAuthError();
                }}
              />
              <button
                type="button"
                className="password-toggle-btn"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? (
                  <EyeOff size={15} strokeWidth={2} aria-hidden="true" />
                ) : (
                  <Eye size={15} strokeWidth={2} aria-hidden="true" />
                )}
              </button>
            </div>
            <p className="tree-meta-line">
              Created a tree earlier? You can also sign in here using your saved
              access key.
            </p>
          </div>

          <button
            type="submit"
            className="primary-btn"
            disabled={authSubmitting}
          >
            <LogIn size={15} strokeWidth={2.2} aria-hidden="true" />
            <span>
              {authSubmitting ? "Signing in..." : "Log In to My Tree"}
            </span>
          </button>
        </form>
      )}

      <div className="onboarding-how-box" aria-label="How Hoho.xo works">
        <div className="onboarding-how-item">
          <span className="onboarding-how-num">1</span>
          <span>Claim your @handle &amp; share your QR or bio link</span>
        </div>
        <div className="onboarding-how-item">
          <span className="onboarding-how-num">2</span>
          <span>Friends pick an ornament &amp; write an anonymous letter</span>
        </div>
        <div className="onboarding-how-item">
          <span className="onboarding-how-num">3</span>
          <span>Tap ornaments to unfold letters &amp; export HD keepsakes</span>
        </div>
      </div>
    </div>
  );
}
