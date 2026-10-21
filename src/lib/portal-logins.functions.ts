import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { internalEmail, normPhone, tempPassword, validUsername } from "@/lib/portal-logins";

type Item = { clientId: string; username: string; password: string };
export type CreateResult =
  | { clientId: string; status: "created"; username: string; password: string }
  | { clientId: string; status: "exists"; reason: string; profileId: string | null }
  | { clientId: string; status: "failed"; reason: string };

const uuid = /^[0-9a-f-]{36}$/i;

async function requireAdmin(ctx: { supabase: { rpc: (f: "is_admin") => PromiseLike<{ data: unknown }> } }) {
  const { data } = await ctx.supabase.rpc("is_admin");
  if (!data) throw new Error("Forbidden");
}

/** Admin-only: creates confirmed logins (must change password) and links them to clients. Passwords are never stored or logged. */
export const createPortalLogins = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { items: Item[] }) => {
    if (!Array.isArray(input.items) || input.items.length > 200) throw new Error("Invalid list");
    return { items: input.items.map((i) => {
      if (!uuid.test(i.clientId)) throw new Error("Invalid client");
      return { clientId: i.clientId, username: String(i.username).trim().toLowerCase(), password: String(i.password) };
    }) };
  })
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const adminEmail = String(context.claims["email"] ?? "");
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const ids = data.items.map((i) => i.clientId);
    const { data: clients } = await db.from("clients").select("id, full_name, phone, email, profile_id").in("id", ids);
    // phones shared by 2+ selected clients are left off profiles (phone must be unique per account)
    const phoneCount = new Map<string, number>();
    for (const c of clients ?? []) { const p = normPhone(c.phone); if (p) phoneCount.set(p, (phoneCount.get(p) ?? 0) + 1); }
    const out: CreateResult[] = [];
    for (const it of data.items) {
      const c = clients?.find((x) => x.id === it.clientId);
      if (!c) { out.push({ clientId: it.clientId, status: "failed", reason: "Client not found" }); continue; }
      if (c.profile_id) { out.push({ clientId: c.id, status: "failed", reason: "Already has a login" }); continue; }
      if (!validUsername(it.username)) { out.push({ clientId: c.id, status: "failed", reason: "Username must be 3–30 lowercase letters, numbers, dot or underscore" }); continue; }
      if (it.password.length < 8) { out.push({ clientId: c.id, status: "failed", reason: "Password must be at least 8 characters" }); continue; }
      const phone = normPhone(c.phone);
      const email = (c.email || "").trim().toLowerCase() || internalEmail(it.username);
      // never create a duplicate: an account with this username / phone / email already exists
      const ors = [`username.eq.${it.username}`, `email.eq.${email}`];
      if (phone) ors.push(`phone.eq.${phone}`);
      const { data: existing } = await db.from("profiles").select("id, username, phone, email").or(ors.join(",")).limit(1);
      if (existing?.[0]) {
        const e = existing[0];
        const why = e.username === it.username ? "username" : e.email === email ? "email" : "phone number";
        out.push({ clientId: c.id, status: "exists", reason: `An account with this ${why} already exists`, profileId: e.id });
        continue;
      }
      const usePhone = phone && phoneCount.get(phone) === 1 ? phone : "";
      const { data: created, error } = await db.auth.admin.createUser({
        email, password: it.password, email_confirm: true,
        user_metadata: { full_name: c.full_name, phone: usePhone, username: it.username },
        app_metadata: { must_change_password: true },
      });
      if (error || !created.user) {
        out.push({ clientId: c.id, status: "failed", reason: /pwned|weak/i.test(error?.message ?? "") ? "Password is too common — edit it" : error?.message ?? "Could not create login" });
        continue;
      }
      const uid = created.user.id;
      const { error: pErr } = await db.from("profiles").update({ full_name: c.full_name, phone: usePhone, username: it.username, account_type: "client", must_change_password: true }).eq("id", uid);
      const { error: lErr } = await db.from("clients").update({ profile_id: uid }).eq("id", c.id);
      if (pErr || lErr) {
        await db.auth.admin.deleteUser(uid);
        out.push({ clientId: c.id, status: "failed", reason: (pErr ?? lErr)?.message ?? "Could not save" });
        continue;
      }
      await db.from("admin_audit_log").insert({ admin_email: adminEmail, action: "create_login", target_email: email, details: { client_id: c.id, client_name: c.full_name, username: it.username } });
      out.push({ clientId: c.id, status: "created", username: it.username, password: it.password });
    }
    return { results: out };
  });

/** Admin-only: links a client to an existing account instead of creating a duplicate. */
export const linkClientToProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { clientId: string; profileId: string }) => { if (!uuid.test(i.clientId) || !uuid.test(i.profileId)) throw new Error("Invalid"); return i; })
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: taken } = await db.from("clients").select("id").eq("profile_id", data.profileId).limit(1);
    if (taken?.[0]) throw new Error("That account is already linked to another client.");
    const { data: p } = await db.from("profiles").select("email").eq("id", data.profileId).single();
    await db.from("clients").update({ profile_id: data.profileId }).eq("id", data.clientId);
    await db.from("profiles").update({ account_type: "client" }).eq("id", data.profileId);
    await db.from("admin_audit_log").insert({ admin_email: String(context.claims["email"] ?? ""), action: "link_login", target_email: p?.email ?? "", details: { client_id: data.clientId } });
    return { ok: true };
  });

/** Admin-only: new temporary password for a client's login; they must change it at next sign-in. */
export const resetPortalPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { clientId: string }) => { if (!uuid.test(i.clientId)) throw new Error("Invalid client"); return i; })
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: c } = await db.from("clients").select("profile_id").eq("id", data.clientId).single();
    if (!c?.profile_id) throw new Error("This client has no login yet.");
    const { data: p } = await db.from("profiles").select("email, username").eq("id", c.profile_id).single();
    const { data: admins } = await db.from("admins").select("email");
    if (admins?.some((a) => a.email.toLowerCase() === (p?.email ?? "").toLowerCase())) throw new Error("Admin passwords can't be reset here.");
    const password = tempPassword();
    const { error } = await db.auth.admin.updateUserById(c.profile_id, { password });
    if (error) throw new Error(error.message);
    await db.from("profiles").update({ must_change_password: true }).eq("id", c.profile_id);
    await db.from("admin_audit_log").insert({ admin_email: String(context.claims["email"] ?? ""), action: "reset_password", target_email: p?.email ?? "", details: { client_id: data.clientId } });
    return { username: p?.username ?? "", password };
  });
