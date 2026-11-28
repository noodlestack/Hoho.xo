import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HohoExperience } from "@/components/hoho-experience";
import { getTreeRecord, toPublicTreeData } from "@/lib/server-store";
import { parseHandle } from "@/lib/tree-config";

export const dynamic = "force-dynamic";

function formatTreePageTitle(safeHandle: string, displayName?: string): string {
  const cleanName = displayName?.trim() ?? "";
  if (
    !cleanName ||
    cleanName.toLowerCase() === `@${safeHandle}` ||
    cleanName.toLowerCase() === safeHandle
  ) {
    return `@${safeHandle} — Send a Holiday Letter | Hoho.xo`;
  }
  return `${cleanName} (@${safeHandle}) — Hoho.xo`;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const { handle } = await params;
  const sp = searchParams ? await searchParams : {};
  const safeHandle = parseHandle(handle);
  if (!safeHandle) {
    notFound();
  }

  const record = await getTreeRecord(safeHandle).catch(() => null);
  const hasPortablePreview = typeof sp.tree === "string" && sp.tree.length > 0;
  if (!record && !hasPortablePreview) {
    notFound();
  }

  const nameFromQuery = typeof sp.n === "string" ? sp.n : undefined;
  const promptFromQuery = typeof sp.p === "string" ? sp.p : undefined;
  const title = formatTreePageTitle(
    safeHandle,
    record?.config.displayName ?? nameFromQuery,
  );
  const description =
    record?.config.prompt ||
    promptFromQuery ||
    `Send an anonymous holiday letter to hang as an ornament on @${safeHandle}'s Christmas tree.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/t/${safeHandle}`,
    },
    openGraph: {
      title,
      description,
      url: `/t/${safeHandle}`,
      siteName: "Hoho.xo",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function PublicTreePage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { handle } = await params;
  const sp = searchParams ? await searchParams : {};
  const safeHandle = parseHandle(handle);
  if (!safeHandle) {
    notFound();
  }
  const record = await getTreeRecord(safeHandle).catch(() => null);
  const hasPortablePreview = typeof sp.tree === "string" && sp.tree.length > 0;
  if (!record && !hasPortablePreview) {
    notFound();
  }
  const initialPublicTree = toPublicTreeData(record ?? safeHandle);

  return (
    <HohoExperience
      initialHandle={safeHandle}
      initialPublicTree={initialPublicTree}
      mode="visitor"
    />
  );
}
