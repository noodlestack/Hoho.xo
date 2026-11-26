import type { Metadata } from "next";
import { HohoExperience } from "@/components/hoho-experience";
import { getTreeRecord, toPublicTreeData } from "@/lib/server-store";
import { sanitizeHandle } from "@/lib/tree-config";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const safeHandle = sanitizeHandle(handle);
  const record = await getTreeRecord(safeHandle).catch(() => null);
  const displayName = record?.config.displayName || `@${safeHandle}`;
  const prompt =
    record?.config.prompt ||
    "Send an anonymous note to hang on this interactive 3D ASCII Christmas tree.";

  return {
    title: `${displayName} (@${safeHandle}) — Hoho.xo`,
    description: prompt,
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function PublicTreePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const safeHandle = sanitizeHandle(handle);
  const record = await getTreeRecord(safeHandle).catch(() => null);
  const initialPublicTree = toPublicTreeData(record ?? safeHandle);

  return (
    <HohoExperience
      initialHandle={safeHandle}
      initialPublicTree={initialPublicTree}
      mode="visitor"
    />
  );
}
