import { NextResponse } from "next/server";
import { getStorageMode } from "@/lib/server-store";

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      storage: getStorageMode(),
      timestamp: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
