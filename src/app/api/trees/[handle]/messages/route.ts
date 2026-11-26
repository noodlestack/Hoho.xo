import { NextResponse } from "next/server";
import {
  addAnonymousMessage,
  checkRateLimit,
  getClientIpHash,
} from "@/lib/server-store";
import { parseHandle } from "@/lib/tree-config";
import { createMessageSchema, formatZodError } from "@/lib/validation";

export async function POST(
  request: Request,
  context: { params: Promise<{ handle: string }> },
) {
  const { handle } = await context.params;
  const cleanHandle = parseHandle(handle);
  if (!cleanHandle) {
    return NextResponse.json(
      { ok: false, error: "Tree not found." },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  let rawPayload: unknown;
  try {
    rawPayload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  if (!rawPayload || typeof rawPayload !== "object") {
    return NextResponse.json(
      { ok: false, error: "Invalid message submission." },
      { status: 400 },
    );
  }

  // Honeypot trap for naive bots: succeed silently without saving anything
  const maybeWebsite = (rawPayload as Record<string, unknown>).website;
  if (typeof maybeWebsite === "string" && maybeWebsite.trim().length > 0) {
    return NextResponse.json(
      { ok: true, ignored: true },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }

  const parsed = createMessageSchema.safeParse(rawPayload);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: formatZodError(parsed.error) },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const ipHash = getClientIpHash(request);
  const shortLimit = await checkRateLimit(
    `msg1m:${ipHash}:${cleanHandle}`,
    6,
    60_000,
  );
  if (!shortLimit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: "You are sending notes too quickly. Please wait a minute.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(shortLimit.retryAfterSec ?? 60),
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const hourLimit = await checkRateLimit(
    `msg1h:${ipHash}:${cleanHandle}`,
    30,
    3_600_000,
  );
  if (!hourLimit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: "Hourly note limit reached for this tree. Try again later.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(hourLimit.retryAfterSec ?? 300),
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const bodyText = parsed.data.body;
  const ornamentType = parsed.data.ornamentType ?? null;

  const result = await addAnonymousMessage(cleanHandle, bodyText, ornamentType);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: result.status, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      ornament: result.ornament,
      totalVisible: result.totalVisible,
      selfHarmNotice: Boolean(result.selfHarmNotice),
    },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
