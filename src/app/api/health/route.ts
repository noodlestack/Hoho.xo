import { NextResponse } from "next/server";
import {
  getStorageMode,
  isDurableStorage,
  isSiteUrlConfigured,
  isStorageConfiguredForRuntime,
} from "@/lib/server-store";

export async function GET() {
  const storage = getStorageMode();
  const durable = isDurableStorage();
  const siteUrlConfigured = isSiteUrlConfigured();
  const ok = !(
    process.env.NODE_ENV === "production" &&
    (!durable || !isStorageConfiguredForRuntime())
  );

  return NextResponse.json(
    {
      ok,
      storage,
      durable,
      siteUrlConfigured,
      timestamp: new Date().toISOString(),
    },
    {
      status: ok ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
