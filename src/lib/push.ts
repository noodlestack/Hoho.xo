import { sendNotification, setVapidDetails } from "web-push";
import {
  claimOwnerPushCoalesceWindow,
  listOwnerPushSubscriptions,
  removeOwnerPushSubscription,
} from "./server-store";

export const pushTransport = {
  setVapidDetails,
  sendNotification,
};

let configuredPair: string | null = null;

function ensureVapidConfigured(): boolean {
  const publicKey = (
    process.env.VAPID_PUBLIC_KEY ||
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
    ""
  ).trim();
  const privateKey = (process.env.VAPID_PRIVATE_KEY || "").trim();
  if (!publicKey || !privateKey) {
    return false;
  }
  const subject = (process.env.VAPID_SUBJECT || "mailto:hello@hoho.xo").trim();
  const keySig = `${subject}:${publicKey}:${privateKey}`;
  if (configuredPair !== keySig) {
    pushTransport.setVapidDetails(subject, publicKey, privateKey);
    configuredPair = keySig;
  }
  return true;
}

export function resetPushConfigForTests(): void {
  configuredPair = null;
}

export async function sendOwnerNewOrnamentPush(
  handle: string,
): Promise<{ sent: number; skipped: boolean }> {
  if (!ensureVapidConfigured()) {
    return { sent: 0, skipped: true };
  }

  const allowed = await claimOwnerPushCoalesceWindow(handle, 60_000);
  if (!allowed) {
    return { sent: 0, skipped: true };
  }

  const subs = await listOwnerPushSubscriptions(handle);
  if (subs.length === 0) {
    return { sent: 0, skipped: true };
  }

  // Strictly generic payload — never include anonymous note text or sender hints (PRODUCT.md)
  const payload = JSON.stringify({
    title: "New ornament on your Hoho.xo tree",
    body: "Open Mail to unwrap it.",
    url: "/",
  });

  let sent = 0;
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await pushTransport.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
          },
          payload,
          { TTL: 3600 },
        );
        sent += 1;
      } catch (err) {
        const statusCode =
          err && typeof err === "object" && "statusCode" in err
            ? Number((err as { statusCode?: unknown }).statusCode)
            : 0;
        if (statusCode === 404 || statusCode === 410) {
          await removeOwnerPushSubscription(handle, sub.endpoint);
        }
      }
    }),
  );

  return { sent, skipped: false };
}
