import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { parseLoginId, isSyntheticEmail, LOGIN_FAIL, LOGIN_LIMIT } from "@/lib/login-id";

const input = (d: unknown) => {
  const o = (d ?? {}) as Record<string, unknown>;
  return { identifier: String(o["identifier"] ?? "").slice(0, 200), password: String(o["password"] ?? "").slice(0, 200) };
};

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient(process.env["SUPABASE_URL"]!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: { fetch: (i, init) => {
      const h = new Headers(init?.headers);
      if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
      h.set("apikey", key);
      return fetch(i, { ...init, headers: h });
    } },
  });
}

async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

/** Finds the auth email for an identifier (server only). */
async function resolveEmail(raw: string) {
  const id = parseLoginId(raw);
  if (!id.value) return { key: "", email: null as string | null };
  const key = `${id.kind}:${id.value}`;
  if (id.kind === "email") return { key, email: id.value };
  const db = await admin();
  const { data } = await db.from("profiles").select("email").eq(id.kind, id.value).maybeSingle();
  return { key, email: data?.email ?? null };
}

async function limited(key: string, record: boolean) {
  const db = await admin();
  const since = new Date(Date.now() - 15 * 60_000).toISOString();
  const { count } = await db.from("login_attempts").select("id", { count: "exact", head: true }).eq("identifier", key).gte("created_at", since);
  if ((count ?? 0) >= 5) return true;
  if (record) await db.from("login_attempts").insert({ identifier: key });
  return false;
}

/** Signs in with email/phone/username + password; returns only a session. */
export const signInWithIdentifier = createServerFn({ method: "POST" })
  .inputValidator(input)
  .handler(async ({ data }) => {
    const { key, email } = await resolveEmail(data.identifier);
    if (!key || !data.password) return { error: LOGIN_FAIL };
    if (await limited(key, false)) return { error: LOGIN_LIMIT };
    const res = email ? await publicClient().auth.signInWithPassword({ email, password: data.password }) : null;
    if (!res?.data.session) {
      await limited(key, true);
      return { error: LOGIN_FAIL };
    }
    const db = await admin();
    await db.from("login_attempts").delete().eq("identifier", key);
    return { access_token: res.data.session.access_token, refresh_token: res.data.session.refresh_token };
  });

/** Sends the reset link to the account's email. */
export const requestPasswordReset = createServerFn({ method: "POST" })
  .inputValidator(input)
  .handler(async ({ data }) => {
    const { key, email } = await resolveEmail(data.identifier);
    if (!key) return { status: "sent" as const };
    if (await limited(`reset:${key}`, true)) return { status: "limited" as const };
    if (!email) return { status: "sent" as const };
    if (isSyntheticEmail(email)) return { status: "no_email" as const };
    const origin = new URL(getRequest().url).origin;
    const { error } = await publicClient().auth.resetPasswordForEmail(email, { redirectTo: `${origin}/reset-password` });
    if (error) console.error("reset", error.message);
    return { status: error ? ("error" as const) : ("sent" as const) };
  });
