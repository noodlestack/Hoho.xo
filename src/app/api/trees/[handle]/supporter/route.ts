import { NextResponse } from "next/server";
import { z } from "zod";
import {
  assertSameOrigin,
  getOwnerTokenFromRequest,
  setTreeSupporter,
  verifyTreeOwner,
} from "@/lib/server-store";
import {
  isSupporterCodeEnabled,
  verifySupporterCode,
} from "@/lib/supporter-codes";
import { parseHandle } from "@/lib/tree-config";

const supporterCodeSchema = z.object({
  code: z.string().trim().min(1, "Enter a supporter code.").max(64),
});

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
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const parsed = supporterCodeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid code." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!isSupporterCodeEnabled()) {
    return NextResponse.json(
      { ok: false, error: "Supporter codes are not enabled on this host." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!verifySupporterCode(parsed.data.code)) {
    return NextResponse.json(
      { ok: false, error: "Invalid supporter code." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  const updated = await setTreeSupporter(cleanHandle, true);
  if (!updated) {
    return NextResponse.json(
      { ok: false, error: "Tree not found." },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    { ok: true, supporter: true, config: updated.config },
    { headers: { "Cache-Control": "no-store" } },
  );
}
