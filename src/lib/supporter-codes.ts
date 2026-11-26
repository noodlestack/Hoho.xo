import crypto from "node:crypto";

function parseSupporterCodeList(
  env?: Record<string, string | undefined>,
): string[] {
  const raw =
    (env ? env.HOHO_SUPPORTER_CODES : process.env.HOHO_SUPPORTER_CODES) ?? "";
  return raw
    .split(",")
    .map((entry) => entry.trim().toUpperCase())
    .filter((entry) => entry.length >= 4 && entry.length <= 64);
}

export function isSupporterCodeEnabled(
  env?: Record<string, string | undefined>,
): boolean {
  return parseSupporterCodeList(env).length > 0;
}

function sha256Digest(value: string): Buffer {
  return crypto.createHash("sha256").update(value, "utf8").digest();
}

export function verifySupporterCode(
  providedCode: string,
  env?: Record<string, string | undefined>,
): boolean {
  const normalized = providedCode.trim().toUpperCase();
  if (!normalized) return false;
  const codes = parseSupporterCodeList(env);
  if (codes.length === 0) return false;

  const providedHash = sha256Digest(normalized);
  let matched = false;
  for (const expected of codes) {
    const expectedHash = sha256Digest(expected);
    if (crypto.timingSafeEqual(providedHash, expectedHash)) {
      matched = true;
    }
  }
  return matched;
}
