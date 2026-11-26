import { NextResponse } from "next/server";
import {
  addAnonymousMessage,
  checkRateLimit,
  getClientIpHash,
  getGlobalMsgLimit,
  getHandleHourlyLimit,
  isStorageConfiguredForRuntime,
  RATE_LIMIT_POLICY,
  type RateLimitResult,
} from "@/lib/server-store";
import { parseHandle } from "@/lib/tree-config";
import {
  createMessageSchema,
  formatZodError,
  idempotencyKeySchema,
} from "@/lib/validation";

function rateLimitDeniedResponse(
  result: RateLimitResult,
  rateLimitMessage: string,
  fallbackRetrySec: number,
): NextResponse {
  if (result.unavailable) {
    return NextResponse.json(
      { ok: false, error: "Please try again in a moment." },
      {
        status: 503,
        headers: {
          "Retry-After": String(
            result.retryAfterSec ?? RATE_LIMIT_POLICY.retryAfterOnUnavailableSec,
          ),
          "Cache-Control": "no-store",
        },
      },
    );
  }
  return NextResponse.json(
    { ok: false, error: rateLimitMessage },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSec ?? fallbackRetrySec),
        "Cache-Control": "no-store",
      },
    },
  );
}

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

  if (!isStorageConfiguredForRuntime()) {
    return NextResponse.json(
      { ok: false, error: "Storage is not configured." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
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

  let idempotencyKey: string | undefined;
  const rawIdem = request.headers.get("idempotency-key");
  if (rawIdem !== null) {
    const parsedIdem = idempotencyKeySchema.safeParse(rawIdem);
    if (!parsedIdem.success) {
      return NextResponse.json(
        { ok: false, error: formatZodError(parsedIdem.error) },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    idempotencyKey = parsedIdem.data;
  }

  const ipHash = getClientIpHash(request);

  const globalLimit = await checkRateLimit(
    `global:${ipHash}`,
    getGlobalMsgLimit(),
    RATE_LIMIT_POLICY.limits.globalMsgWindowMs,
  );
  if (!globalLimit.allowed) {
    return rateLimitDeniedResponse(
      globalLimit,
      "Too many notes sent right now. Please try again in a few minutes.",
      600,
    );
  }

  const handleLimit = await checkRateLimit(
    `handle1h:${cleanHandle}`,
    getHandleHourlyLimit(),
    RATE_LIMIT_POLICY.limits.handleHourlyWindowMs,
  );
  if (!handleLimit.allowed) {
    return rateLimitDeniedResponse(
      handleLimit,
      "This tree is receiving too many notes right now. Try again shortly.",
      300,
    );
  }

  const shortLimit = await checkRateLimit(
    `msg1m:${ipHash}:${cleanHandle}`,
    RATE_LIMIT_POLICY.limits.ipHandleMinMax,
    RATE_LIMIT_POLICY.limits.ipHandleMinWindowMs,
  );
  if (!shortLimit.allowed) {
    return rateLimitDeniedResponse(
      shortLimit,
      "You are sending notes too quickly. Please wait a minute.",
      60,
    );
  }

  const hourLimit = await checkRateLimit(
    `msg1h:${ipHash}:${cleanHandle}`,
    RATE_LIMIT_POLICY.limits.ipHandleHourMax,
    RATE_LIMIT_POLICY.limits.ipHandleHourWindowMs,
  );
  if (!hourLimit.allowed) {
    return rateLimitDeniedResponse(
      hourLimit,
      "Hourly note limit reached for this tree. Try again later.",
      300,
    );
  }

  const bodyText = parsed.data.body;
  const ornamentType = parsed.data.ornamentType ?? null;

  const result = await addAnonymousMessage(cleanHandle, bodyText, ornamentType, {
    idempotencyKey,
  });
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
