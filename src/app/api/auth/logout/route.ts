import { NextResponse } from "next/server";
import { assertSameOrigin, buildClearOwnerCookie } from "@/lib/server-store";
import { parseHandle } from "@/lib/tree-config";
import { formatZodError, logoutSchema } from "@/lib/validation";

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

  const parsed = logoutSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: formatZodError(parsed.error) },
      { status: 400 },
    );
  }

  const clean = parseHandle(parsed.data.handle);
  if (!clean) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  return NextResponse.json(
    { ok: true },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        "Set-Cookie": buildClearOwnerCookie(clean),
      },
    },
  );
}
