import { NextResponse, type NextRequest } from "next/server";
import { getTreeRecord } from "@/lib/server-store";
import { parseHandle } from "@/lib/tree-config";

/**
 * Pre-render route guard for `/t/[handle]` so invalid or unclaimed tree URLs
 * return a genuine HTTP 404 status code with the styled `not-found.tsx` page (fixes BUG-03).
 */
export async function proxy(request: NextRequest) {
  if (request.nextUrl.searchParams.has("tree")) {
    return NextResponse.next();
  }

  const segments = request.nextUrl.pathname.split("/").filter(Boolean);
  const rawHandle = segments[1] ?? "";
  const cleanHandle = parseHandle(rawHandle);
  if (!cleanHandle) {
    return NextResponse.rewrite(new URL("/_missing_tree_404", request.url));
  }

  const record = await getTreeRecord(cleanHandle).catch(() => null);
  if (!record) {
    return NextResponse.rewrite(new URL("/_missing_tree_404", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/t/:handle"],
};
