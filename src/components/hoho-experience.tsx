"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AsciiTreeCanvas,
  type CameraViewMode,
} from "@/components/ascii-tree-canvas";
import {
  PanelFooter,
  SidebarTopbar,
  StageHeader,
} from "@/components/hoho/experience-chrome";
import type { StudioTab } from "@/components/hoho/experience-helpers";
import { MobileOwnerSheet } from "@/components/hoho/mobile-owner-sheet";
import { MobileVisitorSheet } from "@/components/hoho/mobile-visitor-sheet";
import { OwnerModals } from "@/components/hoho/owner-modals";
import { OwnerStudioPanel } from "@/components/hoho/owner-studio-panel";
import { StageDockFooter } from "@/components/hoho/stage-dock-footer";
import { useExperienceControls } from "@/components/hoho/use-experience-controls";
import { useExperienceHydration } from "@/components/hoho/use-experience-hydration";
import { useKeyboardShortcuts } from "@/components/hoho/use-keyboard-shortcuts";
import { useOwnerMail } from "@/components/hoho/use-owner-mail";
import { useOwnerMailActions } from "@/components/hoho/use-owner-mail-actions";
import { useOwnerSession } from "@/components/hoho/use-owner-session";
import { usePushSubscription } from "@/components/hoho/use-push-subscription";
import { useVisitorComposer } from "@/components/hoho/use-visitor-composer";
import { VisitorComposePanel } from "@/components/hoho/visitor-compose-panel";
import type { TreeMessage } from "@/lib/messages";
import type { PublicTreeData } from "@/lib/server-store";
import {
  defaultTreeConfig,
  parseHandle,
  type TreeConfig,
} from "@/lib/tree-config";
import { TREE_THEMES } from "@/lib/tree-themes";

export type ExperienceMode = "owner" | "visitor";

interface HohoExperienceProps {
  mode: ExperienceMode;
  initialHandle?: string;
  initialPublicTree?: PublicTreeData;
}

function clearTimerRef(ref: { current: number | null }) {
  if (ref.current) window.clearTimeout(ref.current);
}

export function HohoExperience({
  mode,
  initialHandle,
  initialPublicTree,
}: HohoExperienceProps) {
  const isOwnerMode = mode === "owner";
  const initialSafeHandle = initialHandle
    ? (parseHandle(initialHandle) ?? "")
    : "";
  const initialVisitorTree =
    !isOwnerMode && initialPublicTree ? initialPublicTree : null;

  const [activeHandle, setActiveHandle] = useState<string>(initialSafeHandle);
  const [config, setConfig] = useState<TreeConfig>(() =>
    initialVisitorTree
      ? initialVisitorTree.config
      : defaultTreeConfig(initialSafeHandle),
  );
  const [messages, setMessages] = useState<TreeMessage[]>(() =>
    initialVisitorTree
      ? initialVisitorTree.ornaments.map((o) => ({ ...o, body: "" }))
      : [],
  );
  const [publicTotalVisible, setPublicTotalVisible] = useState<number | null>(
    () => (initialVisitorTree ? initialVisitorTree.totalVisible : null),
  );
  const [origin, setOrigin] = useState<string>("");
  const [viewMode, setViewMode] = useState<CameraViewMode>("tree");
  const [zoom, setZoom] = useState<number>(1);
  const [studioTab, setStudioTab] = useState<StudioTab>("share");
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [daysToChristmas, setDaysToChristmas] = useState<number | null>(null);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  const [staticMode, setStaticMode] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [serverSynced, setServerSynced] = useState<boolean>(() =>
    Boolean(initialVisitorTree),
  );

  const [mailOpen, setMailOpen] = useState<boolean>(false);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [latestDroppedId, setLatestDroppedId] = useState<string | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState<boolean>(false);
  const [inviteSheetOpen, setInviteSheetOpen] = useState<boolean>(false);
  const [supportOpen, setSupportOpen] = useState<boolean>(false);
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState<boolean>(false);

  const copiedTimerRef = useRef<number | null>(null);
  const dropTimerRef = useRef<number | null>(null);
  const configSyncTimerRef = useRef<number | null>(null);
  const shortcutsWrapRef = useRef<HTMLDivElement | null>(null);
  const visitorCardRef = useRef<HTMLElement | null>(null);
  const hydratedRef = useRef<boolean>(false);
  const activeHandleRef = useRef<string>(initialSafeHandle);
  const serverSyncedRef = useRef<boolean>(Boolean(initialVisitorTree));
  const soundEnabledRef = useRef<boolean>(true);

  useEffect(() => {
    activeHandleRef.current = activeHandle;
    serverSyncedRef.current = serverSynced;
    soundEnabledRef.current = soundEnabled;
  }, [activeHandle, serverSynced, soundEnabled]);

  const showToast = useCallback(
    (message: string, variant: "success" | "info" | "error" = "success") => {
      if (variant === "error") toast.error(message);
      else if (variant === "info") toast.info(message);
      else toast.success(message);
    },
    [],
  );

  const { seedKnownMessages, resetMailTracking, refreshOwnerMail } =
    useOwnerMail({
      isOwnerMode,
      serverSynced,
      activeHandleRef,
      serverSyncedRef,
      soundEnabledRef,
      dropTimerRef,
      setMessages,
      setLatestDroppedId,
      showToast,
    });

  const ownerSession = useOwnerSession({
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
  });

  const pushSub = usePushSubscription({ activeHandle, showToast });
  const theme = TREE_THEMES[config.themeId] ?? TREE_THEMES.fairy;

  const controls = useExperienceControls({
    isOwnerMode,
    activeHandle,
    handleDraft: ownerSession.handleDraft,
    origin,
    serverSynced,
    serverSyncedRef,
    hydratedRef,
    copiedTimerRef,
    configSyncTimerRef,
    config,
    setConfig,
    theme,
    messages,
    publicTotalVisible,
    activeMessageId,
    setViewMode,
    soundEnabled,
    showToast,
  });

  useEffect(() => {
    return () => {
      clearTimerRef(copiedTimerRef);
      clearTimerRef(dropTimerRef);
      clearTimerRef(configSyncTimerRef);
    };
  }, []);

  const {
    flyingOrnament,
    flyingOrnamentRef,
    visitorInputRef,
    visitorSubmitBtnRef,
    composeSubmitKeyRef,
    ...visitor
  } = useVisitorComposer({
    isOwnerMode,
    isMobileViewport,
    activeHandle,
    config,
    setConfig,
    theme,
    viewMode,
    setViewMode,
    soundEnabled,
    reducedMotion,
    setMessages,
    setPublicTotalVisible,
    setLatestDroppedId,
    dropTimerRef,
  });

  useExperienceHydration({
    isOwnerMode,
    initialHandle,
    initialPublicTree,
    reducedMotion,
    staticMode,
    shortcutsOpen,
    shortcutsWrapRef,
    visitorCardRef,
    hydratedRef,
    setReducedMotion,
    setIsOnline,
    setOrigin,
    setStaticMode,
    setDaysToChristmas,
    setActiveHandle,
    setHandleDraft: ownerSession.setHandleDraft,
    setStudioTab,
    setConfig,
    setMessages,
    setServerSynced,
    setOwnerKey: ownerSession.setOwnerKey,
    setNoteBody: visitor.setNoteBody,
    setPublicTotalVisible,
    setShortcutsOpen,
    setIsMobileViewport,
    seedKnownMessages,
    claimOrSyncOwner: ownerSession.claimOrSyncOwner,
  });

  useKeyboardShortcuts({
    isOwnerMode,
    setViewMode,
    setMailOpen,
    setShortcutsOpen,
    visitorCardRef,
    visitorInputRef,
  });

  const mailActions = useOwnerMailActions({
    isOwnerMode,
    activeHandle,
    messages,
    prompt: config.prompt,
    soundEnabled,
    serverSyncedRef,
    setMessages,
    setActiveMessageId,
    seedKnownMessages,
    showToast,
  });

  const handleOpenMail = useCallback(() => {
    setMailOpen(true);
    if (serverSyncedRef.current) void refreshOwnerMail(activeHandle);
  }, [activeHandle, refreshOwnerMail]);

  const navChromeProps = {
    isOwnerMode,
    visitorRelativeHref: controls.visitorRelativeHref,
    messagesCount: messages.length,
    unreadCount: controls.unreadCount,
    unreadTickSeq: controls.unreadTickSeq,
    musicPlaying: controls.musicPlaying,
    currentTrack: controls.currentTrack,
    onToggleMusic: controls.handleToggleMusic,
    onOpenMail: handleOpenMail,
  };

  return (
    <div
      className={[
        "hoho-app",
        !isOwnerMode && isMobileViewport ? "is-visitor-mobile" : "",
        !isOwnerMode && isMobileViewport && visitor.visitorSnap === 0.28
          ? "is-visitor-peek"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ "--accent": theme.swatch } as React.CSSProperties}
    >
      <div className="stage-shell">
        <StageHeader
          {...navChromeProps}
          viewMode={viewMode}
          onChangeViewMode={controls.changeViewMode}
        />

        <main className="stage-container">
          <AsciiTreeCanvas
            handle={activeHandle}
            qrValue={controls.shareUrl}
            matrix={controls.qrMatrix}
            theme={theme}
            topper={config.topper}
            shape={config.shape}
            scenery={config.scenery}
            zoom={zoom}
            viewMode={viewMode}
            showSnow={config.showSnow}
            showGarland={config.showGarland}
            showOrnaments={config.showOrnaments}
            ornaments={controls.resolvedOrnaments}
            latestDroppedId={latestDroppedId}
            reducedMotion={reducedMotion || staticMode}
            staticMode={staticMode}
            supporter={Boolean(config.supporter)}
            isOwnerMode={isOwnerMode}
            onSelectOrnament={mailActions.handleSelectOrnament}
            onToggleQrView={() =>
              controls.changeViewMode((prev) => (prev === "qr" ? "tree" : "qr"))
            }
            onZoomChange={setZoom}
          />
        </main>

        <StageDockFooter
          viewMode={viewMode}
          zoom={zoom}
          setZoom={setZoom}
          shortcutsOpen={shortcutsOpen}
          setShortcutsOpen={setShortcutsOpen}
          shortcutsWrapRef={shortcutsWrapRef}
          isOwnerMode={isOwnerMode}
          theme={theme}
          showOrnaments={config.showOrnaments}
          resolvedOrnaments={controls.resolvedOrnaments}
          onDownloadQr={controls.handleDownloadQr}
          onToggleQr={() =>
            controls.changeViewMode((prev) => (prev === "qr" ? "tree" : "qr"))
          }
          onOpenMessage={mailActions.handleOpenMessage}
        />
      </div>

      <div className="sidebar-shell">
        <SidebarTopbar {...navChromeProps} />

        <aside
          ref={visitorCardRef}
          className="social-card"
          aria-label={
            isOwnerMode
              ? "Owner tree creator hub"
              : `Send an anonymous note to @${activeHandle}`
          }
        >
          {!isOnline ? (
            <div className="offline-pill" role="status">
              Offline — changes will sync when reconnected
            </div>
          ) : null}
          {isOwnerMode ? (
            <OwnerStudioPanel
              studioTab={studioTab}
              setStudioTab={setStudioTab}
              ownerClaimError={ownerSession.ownerClaimError}
              activeHandle={activeHandle}
              config={config}
              updateConfig={controls.updateConfig}
              avatarGlyph={controls.avatarGlyph}
              daysToChristmas={daysToChristmas}
              serverSynced={serverSynced}
              shareUrl={controls.shareUrl}
              visitorRelativeHref={controls.visitorRelativeHref}
              copiedLink={controls.copiedLink}
              onCopyLink={controls.handleCopyLink}
              onCopyText={controls.handleCopyText}
              onOpenInviteSheet={() => {
                setMobileSheetOpen(false);
                setInviteSheetOpen(true);
              }}
              viewMode={viewMode}
              onToggleQrView={() =>
                controls.changeViewMode((prev) =>
                  prev === "qr" ? "tree" : "qr",
                )
              }
              pushSubscribed={pushSub.pushSubscribed}
              pushBusy={pushSub.pushBusy}
              iosNeedsStandalone={pushSub.iosNeedsStandalone}
              onTogglePush={pushSub.handleTogglePush}
              unreadCount={controls.unreadCount}
              newestUnread={controls.newestUnread}
              onOpenMessage={mailActions.handleOpenMessage}
              messagesCount={messages.length}
              visibleCount={controls.visibleCount}
              currentTrack={controls.currentTrack}
              musicPlaying={controls.musicPlaying}
              onToggleMusic={controls.handleToggleMusic}
              onNextTrack={controls.handleNextTrack}
              soundEnabled={soundEnabled}
              onToggleSound={setSoundEnabled}
              handleDraft={ownerSession.handleDraft}
              setHandleDraft={ownerSession.setHandleDraft}
              commitHandleChange={ownerSession.commitHandleChange}
              hasInvalidHandleDraft={controls.hasInvalidHandleDraft}
              hasPendingHandleChange={controls.hasPendingHandleChange}
              pendingHandleSlug={controls.pendingHandleSlug}
              onCycleOwnerPrompt={controls.handleCycleOwnerPrompt}
              ownerKey={ownerSession.ownerKey}
              unlockDraft={ownerSession.unlockDraft}
              setUnlockDraft={ownerSession.setUnlockDraft}
              handleUnlockWithKey={ownerSession.handleUnlockWithKey}
            />
          ) : (
            <VisitorComposePanel
              activeHandle={activeHandle}
              config={config}
              theme={theme}
              avatarGlyph={controls.avatarGlyph}
              daysToChristmas={daysToChristmas}
              visibleCount={controls.visibleCount}
              visitorSentOrnament={visitor.visitorSentOrnament}
              setVisitorSentOrnament={visitor.setVisitorSentOrnament}
              sentOrnamentColor={visitor.sentOrnamentColor}
              sentOrnamentMeta={visitor.sentOrnamentMeta}
              noteBody={visitor.noteBody}
              setNoteBody={visitor.setNoteBody}
              honeypot={visitor.honeypot}
              setHoneypot={visitor.setHoneypot}
              selectedOrnament={visitor.selectedOrnament}
              setSelectedOrnament={visitor.setSelectedOrnament}
              submittingNote={visitor.submittingNote}
              submitError={visitor.submitError}
              setSubmitError={visitor.setSubmitError}
              composeSubmitKeyRef={composeSubmitKeyRef}
              visitorInputRef={visitorInputRef}
              visitorSubmitBtnRef={visitorSubmitBtnRef}
              onVisitorDice={visitor.handleVisitorDice}
              onSubmit={visitor.handleVisitorSubmit}
            />
          )}

          <PanelFooter
            isOwnerMode={isOwnerMode}
            onOpenSupport={() => setSupportOpen(true)}
          />
        </aside>
      </div>

      {isMobileViewport && isOwnerMode ? (
        <MobileOwnerSheet
          open={mobileSheetOpen}
          onOpenChange={setMobileSheetOpen}
          isOnline={isOnline}
          studioTab={studioTab}
          setStudioTab={setStudioTab}
          activeHandle={activeHandle}
          config={config}
          updateConfig={controls.updateConfig}
          avatarGlyph={controls.avatarGlyph}
          copiedLink={controls.copiedLink}
          onCopyLink={controls.handleCopyLink}
          messagesCount={messages.length}
          onOpenInviteSheet={() => setInviteSheetOpen(true)}
          onOpenMail={() => setMailOpen(true)}
          handleDraft={ownerSession.handleDraft}
          setHandleDraft={ownerSession.setHandleDraft}
          commitHandleChange={ownerSession.commitHandleChange}
          onOpenSupport={() => setSupportOpen(true)}
        />
      ) : null}

      {isMobileViewport && !isOwnerMode ? (
        <MobileVisitorSheet
          activeHandle={activeHandle}
          config={config}
          theme={theme}
          isOnline={isOnline}
          visitorSnap={visitor.visitorSnap}
          onVisitorSnapChange={visitor.handleVisitorSnapChange}
          keyboardOffset={visitor.keyboardOffset}
          selectedOrnament={visitor.selectedOrnament}
          setSelectedOrnament={visitor.setSelectedOrnament}
          visitorSentOrnament={visitor.visitorSentOrnament}
          setVisitorSentOrnament={visitor.setVisitorSentOrnament}
          sentOrnamentColor={visitor.sentOrnamentColor}
          sentOrnamentMeta={visitor.sentOrnamentMeta}
          noteBody={visitor.noteBody}
          setNoteBody={visitor.setNoteBody}
          honeypot={visitor.honeypot}
          setHoneypot={visitor.setHoneypot}
          submittingNote={visitor.submittingNote}
          submitError={visitor.submitError}
          setSubmitError={visitor.setSubmitError}
          composeSubmitKeyRef={composeSubmitKeyRef}
          onVisitorDice={visitor.handleVisitorDice}
          onSubmit={visitor.handleVisitorSubmit}
        />
      ) : null}

      {isOwnerMode ? (
        <OwnerModals
          mailOpen={mailOpen}
          setMailOpen={setMailOpen}
          activeMessage={controls.activeMessage}
          setActiveMessageId={setActiveMessageId}
          inviteSheetOpen={inviteSheetOpen}
          setInviteSheetOpen={setInviteSheetOpen}
          supportOpen={supportOpen}
          setSupportOpen={setSupportOpen}
          messages={messages}
          activeOrnamentIds={controls.activeOrnamentIds}
          shareUrl={controls.shareUrl}
          theme={theme}
          activeHandle={activeHandle}
          config={config}
          setConfig={setConfig}
          onOpenMessage={mailActions.handleOpenMessage}
          onCopyShareLink={controls.handleCopyLink}
          onMarkAllRead={mailActions.handleMarkAllRead}
          onExportKeepsake={mailActions.handleExportKeepsake}
          onDelete={mailActions.handleDeleteMessage}
          onReport={mailActions.handleReportMessage}
          onToggleStar={mailActions.handleToggleStarMessage}
          onMarkReplied={mailActions.handleMarkMessageReplied}
          showToast={showToast}
        />
      ) : null}

      {flyingOrnament && !reducedMotion ? (
        <div
          ref={flyingOrnamentRef}
          className="flying-ornament"
          style={{
            color: flyingOrnament.color,
            borderColor: flyingOrnament.color,
          }}
          aria-hidden="true"
        >
          {flyingOrnament.glyph}
        </div>
      ) : null}
    </div>
  );
}
