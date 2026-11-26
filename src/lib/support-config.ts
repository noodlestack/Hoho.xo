export type SupportChannelId =
  "kofi" | "buymeacoffee" | "paypal" | "patreon" | "github-sponsors" | "custom";

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
  const paypalRaw = env
    ? env.NEXT_PUBLIC_PAYPAL_URL
    : process.env.NEXT_PUBLIC_PAYPAL_URL;
  const patreonRaw = env
    ? env.NEXT_PUBLIC_PATREON_URL
    : process.env.NEXT_PUBLIC_PATREON_URL;
  const sponsorsRaw = env
    ? env.NEXT_PUBLIC_GITHUB_SPONSORS_URL
    : process.env.NEXT_PUBLIC_GITHUB_SPONSORS_URL;
  const customUrlRaw = env
    ? env.NEXT_PUBLIC_CUSTOM_SUPPORT_URL
    : process.env.NEXT_PUBLIC_CUSTOM_SUPPORT_URL;
  const customLabelRaw = env
    ? env.NEXT_PUBLIC_CUSTOM_SUPPORT_LABEL
    : process.env.NEXT_PUBLIC_CUSTOM_SUPPORT_LABEL;
  const customDescRaw = env
    ? env.NEXT_PUBLIC_CUSTOM_SUPPORT_DESC
    : process.env.NEXT_PUBLIC_CUSTOM_SUPPORT_DESC;

  const customLabel = customLabelRaw?.trim().slice(0, 48) || "Support Hoho.xo";
  const customDesc =
    customDescRaw?.trim().slice(0, 100) ||
    "Optional direct tip to help keep Hoho.xo free";

  const candidates: Array<{
    id: SupportChannelId;
    label: string;
    description: string;
    raw?: string;
  }> = [
    {
      id: "kofi",
      label: "Support on Ko-fi",
      description: "One-time tip (0% platform fee on tips)",
      raw: kofiRaw,
    },
    {
      id: "buymeacoffee",
      label: "Buy Me a Coffee",
      description: "Quick tip to help cover Redis & hosting bills",
      raw: bmcRaw,
    },
    {
      id: "paypal",
      label: "Tip via PayPal",
      description: "Direct one-time tip via PayPal.me",
      raw: paypalRaw,
    },
    {
      id: "patreon",
      label: "Support on Patreon",
      description: "Optional monthly backing for ongoing updates",
      raw: patreonRaw,
    },
    {
      id: "github-sponsors",
      label: "GitHub Sponsors",
      description: "Back open-source maintenance on GitHub",
      raw: sponsorsRaw,
    },
    {
      id: "custom",
      label: customLabel,
      description: customDesc,
      raw: customUrlRaw,
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
