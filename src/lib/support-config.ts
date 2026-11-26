export type SupportChannelId = "kofi" | "buymeacoffee" | "github-sponsors";

export interface SupportChannel {
  id: SupportChannelId;
  label: string;
  description: string;
  url: string;
}

export function parseHttpsUrl(raw?: string): string | null {
  if (!raw || raw.trim().length === 0 || raw.trim().length > 512) {
    return null;
  }
  try {
    const parsed = new URL(raw.trim());
    if (parsed.protocol !== "https:") return null;
    if (!parsed.hostname || parsed.username || parsed.password) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

export function getSupportChannels(
  env?: Record<string, string | undefined>,
): SupportChannel[] {
  const kofiRaw = env
    ? env.NEXT_PUBLIC_KOFI_URL
    : process.env.NEXT_PUBLIC_KOFI_URL;
  const bmcRaw = env
    ? env.NEXT_PUBLIC_BUYMEACOFFEE_URL
    : process.env.NEXT_PUBLIC_BUYMEACOFFEE_URL;
  const sponsorsRaw = env
    ? env.NEXT_PUBLIC_GITHUB_SPONSORS_URL
    : process.env.NEXT_PUBLIC_GITHUB_SPONSORS_URL;

  const candidates: Array<{
    id: SupportChannelId;
    label: string;
    description: string;
    raw?: string;
  }> = [
    {
      id: "kofi",
      label: "Support on Ko-fi",
      description: "One-time hot cocoa tip (0% platform fee on tips)",
      raw: kofiRaw,
    },
    {
      id: "buymeacoffee",
      label: "Buy Me a Coffee",
      description: "Quick tip to help cover Redis & hosting bills",
      raw: bmcRaw,
    },
    {
      id: "github-sponsors",
      label: "GitHub Sponsors",
      description: "Back open-source maintenance on GitHub",
      raw: sponsorsRaw,
    },
  ];

  const channels: SupportChannel[] = [];
  for (const item of candidates) {
    const valid = parseHttpsUrl(item.raw);
    if (valid) {
      channels.push({
        id: item.id,
        label: item.label,
        description: item.description,
        url: valid,
      });
    }
  }
  return channels;
}

export function getOptionalTipNote(
  env?: Record<string, string | undefined>,
): string | null {
  const raw = env
    ? env.NEXT_PUBLIC_SUPPORT_TIP_NOTE
    : process.env.NEXT_PUBLIC_SUPPORT_TIP_NOTE;
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return null;
  return trimmed.slice(0, 120);
}
