import { NextResponse } from "next/server";
import {
  getOwnerTokenFromRequest,
  getTreeRecord,
  toPublicTreeData,
  updateTreeConfig,
  verifyTreeOwner,
} from "@/lib/server-store";
import { sanitizeHandle } from "@/lib/tree-config";
import { formatZodError, updateConfigSchema } from "@/lib/validation";

export async function GET(
  _request: Request,
  context: { params: Promise<{ handle: string }> },
) {
  const { handle } = await context.params;
  const cleanHandle = sanitizeHandle(handle);
  const record = await getTreeRecord(cleanHandle);

  return NextResponse.json(
    {
      ok: true,
      ...toPublicTreeData(record ?? cleanHandle),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ handle: string }> },
) {
  const { handle } = await context.params;
  const cleanHandle = sanitizeHandle(handle);
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

  const parsed = updateConfigSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: formatZodError(parsed.error) },
      { status: 400 },
    );
  }

  const updated = await updateTreeConfig(cleanHandle, parsed.data);
  if (!updated) {
    return NextResponse.json(
      { ok: false, error: "Tree not found." },
      { status: 404 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      handle: updated.handle,
      config: updated.config,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
