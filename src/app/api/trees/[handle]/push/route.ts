import { NextResponse } from "next/server";
import { z } from "zod";
import {
  assertSameOrigin,
  getOwnerTokenFromRequest,
  listOwnerPushSubscriptions,
  removeOwnerPushSubscription,
  upsertOwnerPushSubscription,
  verifyTreeOwner,
} from "@/lib/server-store";
import { parseHandle } from "@/lib/tree-config";
import { formatZodError } from "@/lib/validation";

const subscribeSchema = z.object({
  endpoint: z
    .string()
    .trim()
    .url()
    .max(2048)
    .refine((val) => val.startsWith("https://"), {
      message: "Push endpoint must use HTTPS.",
    }),
  keys: z.object({
    p256dh: z.string().trim().min(8).max(512),
    auth: z.string().trim().min(4).max(256),
  }),
});

const unsubscribeSchema = z.object({
  endpoint: z.string().trim().url().max(2048),
});

export async function GET(
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

  const token = getOwnerTokenFromRequest(request, cleanHandle);
  const verified = await verifyTreeOwner(cleanHandle, token);
  if (!verified) {
    return NextResponse.json(
      { ok: false, error: "Owner authentication required." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const subs = await listOwnerPushSubscriptions(cleanHandle);
  const endpointParam = new URL(request.url).searchParams.get("endpoint");
  const subscribed = endpointParam
    ? subs.some((s) => s.endpoint === endpointParam)
    : subs.length > 0;

  return NextResponse.json(
    { ok: true, count: subs.length, subscribed },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ handle: string }> },
) {
  const originCheck = assertSameOrigin(request);
  if (!originCheck.ok) {
    return NextResponse.json(
      { ok: false, error: originCheck.error },
      { status: originCheck.status, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { handle } = await context.params;
  const cleanHandle = parseHandle(handle);
  if (!cleanHandle) {
    return NextResponse.json(
      { ok: false, error: "Tree not found." },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  const token = getOwnerTokenFromRequest(request, cleanHandle);
  const verified = await verifyTreeOwner(cleanHandle, token);
  if (!verified) {
    return NextResponse.json(
      { ok: false, error: "Owner authentication required." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: formatZodError(parsed.error) },
      { status: 400 },
    );
  }

  const count = await upsertOwnerPushSubscription(
    cleanHandle,
    {
      endpoint: parsed.data.endpoint,
      keys: parsed.data.keys,
      createdAt: new Date().toISOString(),
    },
    5,
  );

  return NextResponse.json(
    { ok: true, count },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ handle: string }> },
) {
  const originCheck = assertSameOrigin(request);
  if (!originCheck.ok) {
    return NextResponse.json(
      { ok: false, error: originCheck.error },
      { status: originCheck.status, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { handle } = await context.params;
  const cleanHandle = parseHandle(handle);
  if (!cleanHandle) {
    return NextResponse.json(
      { ok: false, error: "Tree not found." },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  const token = getOwnerTokenFromRequest(request, cleanHandle);
  const verified = await verifyTreeOwner(cleanHandle, token);
  if (!verified) {
    return NextResponse.json(
      { ok: false, error: "Owner authentication required." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  const parsed = unsubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: formatZodError(parsed.error) },
      { status: 400 },
    );
  }

  const count = await removeOwnerPushSubscription(
    cleanHandle,
    parsed.data.endpoint,
  );

  return NextResponse.json(
    { ok: true, count },
    { headers: { "Cache-Control": "no-store" } },
  );
}
