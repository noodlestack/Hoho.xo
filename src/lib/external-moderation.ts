const MODERATION_TIMEOUT_MS = 1_500;

const BLOCKED_CATEGORIES = [
  "harassment",
  "harassment/threatening",
  "sexual",
  "sexual/minors",
  "violence",
  "violence/graphic",
] as const;

export interface ExternalModerationResult {
  reject: boolean;
  reason?: string;
}

export async function checkExternalModeration(
  body: string,
): Promise<ExternalModerationResult> {
  const provider = process.env.HOHO_MODERATION_PROVIDER?.trim().toLowerCase();
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (provider !== "openai" || !apiKey) {
    return { reject: false };
  }

  try {
    const res = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "omni-moderation-latest",
        input: body,
      }),
      signal: AbortSignal.timeout(MODERATION_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) {
      return { reject: false };
    }
    const json = (await res.json()) as {
      results?: Array<{
        categories?: Record<string, boolean | undefined>;
      }>;
    };
    const categories = json.results?.[0]?.categories;
    if (!categories) {
      return { reject: false };
    }

    for (const key of BLOCKED_CATEGORIES) {
      if (categories[key] === true) {
        return {
          reject: true,
          reason:
            "This note could not be sent because it conflicts with safety rules.",
        };
      }
    }
    return { reject: false };
  } catch {
    return { reject: false };
  }
}
