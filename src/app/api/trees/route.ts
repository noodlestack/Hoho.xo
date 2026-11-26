import { NextResponse } from "next/server";
import {
  assertSameOrigin,
  buildOwnerCookie,
  checkRateLimit,
  claimOrVerifyTree,
  getClientIpHash,
  getOwnerTokenFromRequest,
  RATE_LIMIT_POLICY,
  verifyTreeOwner,
} from "@/lib/server-store";
import { parseHandle } from "@/lib/tree-config";
import { claimTreeSchema, formatZodError } from "@/lib/validation";

export async function POST(request: Request) {
  const originCheck = assertSameOrigin(request);
  if (!originCheck.ok) {
    return NextResponse.json(
      { ok: false, error: originCheck.error },
      { status: originCheck.status, headers: { "Cache-Control": "no-store" } },
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  const parsed = claimTreeSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: formatZodError(parsed.error) },
      { status: 400 },
    );
  }

  const payload = parsed.data;
  const handle = parseHandle(payload.handle ?? "");
  if (!handle) {
    return NextResponse.json(
      {
        ok: false,
        error: "Handles use 3–20 letters, numbers, or underscores.",
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  const explicitKey =
    payload.ownerKey && payload.ownerKey.trim().length > 0
      ? payload.ownerKey.trim()
      : null;
  const cookieToken = getOwnerTokenFromRequest(request, handle);
  const candidates = [explicitKey, cookieToken].filter(
    (value, idx, arr): value is string =>
      Boolean(value) && arr.indexOf(value) === idx,
  );
  const providedToken = candidates[0] ?? null;

  // Fast path: returning verified owners skip the handle-claim rate limit so page reloads never hit 429
  for (const candidateToken of candidates) {
    const verifiedOwner = await verifyTreeOwner(handle, candidateToken);
    if (verifiedOwner) {
      return NextResponse.json(
        {
          ok: true,
          handle: verifiedOwner.handle,
          created: false,
          config: verifiedOwner.config,
          messages: verifiedOwner.messages,
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store",
            "Set-Cookie": buildOwnerCookie(handle, candidateToken),
          },
        },
      );
    }
  }

  const ipHash = getClientIpHash(request);
  const maxClaimsPerHour =
    process.env.NODE_ENV === "production"
      ? RATE_LIMIT_POLICY.limits.claimHourlyProdMax
      : RATE_LIMIT_POLICY.limits.claimHourlyDevMax;
  const limit = await checkRateLimit(
    `claim:${ipHash}`,
    maxClaimsPerHour,
    RATE_LIMIT_POLICY.limits.claimHourlyWindowMs,
  );
  if (!limit.allowed) {
    if (limit.unavailable) {
      return NextResponse.json(
        { ok: false, error: "Please try again in a moment." },
        {
          status: 503,
          headers: {
            "Retry-After": String(
              limit.retryAfterSec ?? RATE_LIMIT_POLICY.retryAfterOnUnavailableSec,
            ),
            "Cache-Control": "no-store",
          },
        },
      );
    }
    return NextResponse.json(
      { ok: false, error: "Too many handle attempts. Try again shortly." },
      {
        status: 429,
        headers: {
          "Retry-After": String(limit.retryAfterSec ?? 60),
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const result = await claimOrVerifyTree(handle, providedToken, payload.config);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: result.status, headers: { "Cache-Control": "no-store" } },
    );
  }

  const activeCookieToken = result.ownerToken ?? providedToken;
  const headers: Record<string, string> = { "Cache-Control": "no-store" };
  if (activeCookieToken) {
    headers["Set-Cookie"] = buildOwnerCookie(handle, activeCookieToken);
  }

  return NextResponse.json(
    {
      ok: true,
      handle: result.record.handle,
      created: result.created,
      ...(result.ownerToken ? { ownerKey: result.ownerToken } : {}),
      config: result.record.config,
      messages: result.record.messages,
    },
    { status: result.created ? 201 : 200, headers },
  );
}
