import { NextResponse } from "next/server";
import {
  assertSameOrigin,
  deleteMessage,
  getOwnerTokenFromRequest,
  markMessageRead,
  reportMessage,
  verifyTreeOwner,
} from "@/lib/server-store";
import { parseHandle } from "@/lib/tree-config";
import { formatZodError, patchMessageSchema } from "@/lib/validation";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ handle: string; id: string }> },
) {
  const originCheck = assertSameOrigin(request);
  if (!originCheck.ok) {
    return NextResponse.json(
      { ok: false, error: originCheck.error },
      { status: originCheck.status, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { handle, id } = await context.params;
  const cleanHandle = parseHandle(handle);
  if (!cleanHandle) {
    return NextResponse.json(
      { ok: false, error: "Tree not found." },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }
  const token = getOwnerTokenFromRequest(request, cleanHandle);
  const owner = await verifyTreeOwner(cleanHandle, token);

  if (!owner) {
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

  const parsed = patchMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: formatZodError(parsed.error) },
      { status: 400 },
    );
  }

  const payload = parsed.data;
  if (payload.action === "read") {
    const updated = await markMessageRead(cleanHandle, id);
    if (!updated) {
      return NextResponse.json(
        { ok: false, error: "Message not found." },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { ok: true, message: updated },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const updated = await reportMessage(cleanHandle, id, payload.reason);
  if (!updated) {
    return NextResponse.json(
      { ok: false, error: "Message not found." },
      { status: 404 },
    );
  }
  return NextResponse.json(
    { ok: true, message: updated },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ handle: string; id: string }> },
) {
  const originCheck = assertSameOrigin(request);
  if (!originCheck.ok) {
    return NextResponse.json(
      { ok: false, error: originCheck.error },
      { status: originCheck.status, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { handle, id } = await context.params;
  const cleanHandle = parseHandle(handle);
  if (!cleanHandle) {
    return NextResponse.json(
      { ok: false, error: "Tree not found." },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }
  const token = getOwnerTokenFromRequest(request, cleanHandle);
  const owner = await verifyTreeOwner(cleanHandle, token);

  if (!owner) {
    return NextResponse.json(
      { ok: false, error: "Owner authentication required." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const removed = await deleteMessage(cleanHandle, id);
  if (!removed) {
    return NextResponse.json(
      { ok: false, error: "Message not found." },
      { status: 404 },
    );
  }

  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
