export const SESSION_COOKIE = "valpelogg_session";

export function getSitePassword(): string | undefined {
  const value = process.env.SITE_PASSWORD?.trim();
  return value || undefined;
}

export function isAuthEnabled(): boolean {
  return Boolean(getSitePassword());
}

/** Simple signed cookie: expiryMs.signature */
export async function createSessionValue(secret: string): Promise<string> {
  const exp = String(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days
  const sig = await sign(exp, secret);
  return `${exp}.${sig}`;
}

export async function isValidSession(
  token: string | undefined,
  secret: string,
): Promise<boolean> {
  if (!token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig) return false;
  if (Number(exp) < Date.now()) return false;
  return (await sign(exp, secret)) === sig;
}

async function sign(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const buf = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message),
  );
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}
