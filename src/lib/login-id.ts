/** Login identifier helpers — shared by browser and server. */
export type LoginId = { kind: "email" | "phone" | "username"; value: string };

export function parseLoginId(raw: string): LoginId {
  const v = raw.trim();
  if (v.includes("@")) return { kind: "email", value: v.toLowerCase() };
  const d = v.replace(/[\s-]/g, "");
  if (/^\+?\d+$/.test(d)) {
    const m = d.match(/^(?:\+?880|0)?(1[3-9]\d{8})$/);
    return { kind: "phone", value: m ? `0${m[1]}` : d };
  }
  return { kind: "username", value: v.toLowerCase() };
}

/** Placeholder addresses used for accounts created without a real email. */
export const isSyntheticEmail = (e: string) => !e || /@([a-z0-9-]+\.)*(local|invalid|example|internal)$/i.test(e);

export const USERNAME_RE = /^[a-z0-9._]{3,30}$/;

/** "Md. Shah Alam" → "mdshahalam" */
export const suggestUsername = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 30);

export const LOGIN_FAIL = "The login details or password are not correct.";
export const LOGIN_LIMIT = "Too many attempts. Try again in a few minutes.";
