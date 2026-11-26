import { NextResponse } from "next/server";
import {
  getOwnerTokenFromRequest,
  markAllMessagesRead,
  verifyTreeOwner,
} from "@/lib/server-store";
import { parseHandle } from "@/lib/tree-config";
import { formatZodError, patchMailSchema } from "@/lib/validation";

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
  const record = await verifyTreeOwner(cleanHandle, token);

  if (!record) {
    return NextResponse.json(
      { ok: false, error: "Owner authentication required." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const unreadCount = record.messages.filter(
    (m) => m.status === "visible" && m.readAt === null,
  ).length;

  return NextResponse.json(
    {
      ok: true,
      handle: record.handle,
      messages: record.messages,
      unreadCount,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PATCH(
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
  const record = await verifyTreeOwner(cleanHandle, token);

  if (!record) {
    return NextResponse.json(
      { ok: false, error: "Owner authentication required." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
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

  const parsed = patchMailSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: formatZodError(parsed.error) },
      { status: 400 },
    );
  }

  const updatedCount = await markAllMessagesRead(cleanHandle);
  const refreshed = await verifyTreeOwner(cleanHandle, token);

  return NextResponse.json(
    {
      ok: true,
      handle: cleanHandle,
      updatedCount,
      messages: refreshed?.messages ?? record.messages,
      unreadCount: 0,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
