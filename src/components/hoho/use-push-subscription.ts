"use client";

import { useCallback, useEffect, useState } from "react";

export const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ?? "";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

interface UsePushSubscriptionOptions {
  activeHandle: string;
  showToast: (message: string, variant?: "success" | "info" | "error") => void;
}

/** Manages browser Web Push subscription state for an owner's tree notifications. */
export function usePushSubscription({
  activeHandle,
  showToast,
}: UsePushSubscriptionOptions) {
  const [pushSubscribed, setPushSubscribed] = useState<boolean>(false);
  const [pushBusy, setPushBusy] = useState<boolean>(false);
  const [iosNeedsStandalone, setIosNeedsStandalone] = useState<boolean>(false);

  useEffect(() => {
    if (!VAPID_PUBLIC_KEY || typeof window === "undefined") return;
    const ua = window.navigator.userAgent || "";
    const isIos = /iPad|iPhone|iPod/i.test(ua);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((window.navigator as { standalone?: boolean }).standalone);
    queueMicrotask(() => setIosNeedsStandalone(isIos && !isStandalone));
  }, []);

  const handleTogglePush = useCallback(async () => {
    if (!VAPID_PUBLIC_KEY || pushBusy) return;
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      typeof Notification === "undefined"
    ) {
      showToast("Push notifications require a modern browser.", "info");
      return;
    }

    setPushBusy(true);
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();

      if (pushSubscribed && existing) {
        await fetch(`/api/trees/${encodeURIComponent(activeHandle)}/push`, {
          method: "DELETE",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: existing.endpoint }),
        });
        await existing.unsubscribe();
        setPushSubscribed(false);
        showToast("Turned off push alerts for this device", "info");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        showToast("Notification permission was not granted.", "info");
        return;
      }

      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        }));

      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        showToast("Browser push subscription incomplete.", "error");
        return;
      }

      const res = await fetch(
        `/api/trees/${encodeURIComponent(activeHandle)}/push`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: json.endpoint,
            keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
          }),
        },
      );
      if (!res.ok) {
        showToast("Could not enable push notifications right now.", "error");
        return;
      }
      setPushSubscribed(true);
      showToast("Push alerts enabled for new ornaments!");
    } catch {
      showToast("Push setup unavailable in this browser context.", "info");
    } finally {
      setPushBusy(false);
    }
  }, [activeHandle, pushBusy, pushSubscribed, showToast]);

  return {
    pushSubscribed,
    pushBusy,
    iosNeedsStandalone,
    handleTogglePush,
  };
}
