import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Admin-only: email an invite so the client can set a password; their login links to the client record on confirmation. */
export const inviteClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { clientId: string; origin: string }) => {
    if (!/^[0-9a-f-]{36}$/i.test(input.clientId)) throw new Error("Invalid client");
    if (!/^https?:\/\/[^/]+$/.test(input.origin)) throw new Error("Invalid origin");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Forbidden");
    const { data: client, error } = await context.supabase.from("clients").select("id, email, full_name, profile_id").eq("id", data.clientId).single();
    if (error || !client) throw new Error("Client not found");
    if (client.profile_id) return { status: "already_linked" as const };
    if (!client.email) throw new Error("Add an email address to this client first.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: invErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(client.email, {
      redirectTo: `${data.origin}/reset-password`,
      data: { full_name: client.full_name },
    });
    if (invErr) {
      if (/already|registered|exists/i.test(invErr.message)) return { status: "has_account" as const };
      throw new Error(invErr.message);
    }
    return { status: "invited" as const };
  });

/**
 * Admin-only: permanently delete a login (auth user, profile, saved projects).
 * mode "login" keeps any linked client record (unlinked so it can be re-invited);
 * mode "all" also deletes the client record with its payments, instalments and documents.
 * Admin accounts and the caller's own account are refused.
 */
export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { profileId?: string | null; clientId?: string | null; mode: "login" | "all" }) => {
    const uuid = /^[0-9a-f-]{36}$/i;
    if (input.profileId && !uuid.test(input.profileId)) throw new Error("Invalid account");
    if (input.clientId && !uuid.test(input.clientId)) throw new Error("Invalid client");
    if (!input.profileId && !input.clientId) throw new Error("Nothing to delete");
    if (input.mode !== "login" && input.mode !== "all") throw new Error("Invalid mode");
    if (!input.profileId && input.mode !== "all") throw new Error("This client has no login to delete");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Forbidden");
    const adminEmail = String((context.claims as { email?: string }).email ?? "");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let targetEmail = "";
    if (data.profileId) {
      if (data.profileId === context.userId) throw new Error("You can't delete your own account.");
      const { data: u, error } = await supabaseAdmin.auth.admin.getUserById(data.profileId);
      if (error || !u?.user) throw new Error("Account not found");
      targetEmail = (u.user.email ?? "").toLowerCase();
      const { data: adm } = await supabaseAdmin.from("admins").select("email");
      if ((adm ?? []).some((a) => a.email.toLowerCase() === targetEmail)) throw new Error("Admin accounts can't be deleted here.");
    }

    // Client records affected
    let clientIds: string[] = [];
    if (data.clientId) clientIds.push(data.clientId);
    if (data.profileId) {
      const { data: linked } = await supabaseAdmin.from("clients").select("id").eq("profile_id", data.profileId);
      clientIds.push(...(linked ?? []).map((c) => c.id));
    }
    clientIds = [...new Set(clientIds)];
    if (!targetEmail && data.clientId) {
      const { data: c } = await supabaseAdmin.from("clients").select("email").eq("id", data.clientId).maybeSingle();
      targetEmail = c?.email ?? "";
    }

    if (data.mode === "all" && clientIds.length) {
      const { data: docs } = await supabaseAdmin.from("client_documents").select("storage_path").in("client_id", clientIds);
      const paths = (docs ?? []).map((d) => d.storage_path).filter(Boolean);
      if (paths.length) await supabaseAdmin.storage.from("client-docs").remove(paths);
      for (const t of ["payments", "instalments", "client_documents", "client_notes"] as const) {
        const { error } = await supabaseAdmin.from(t).delete().in("client_id", clientIds);
        if (error) throw new Error(`Could not delete ${t}: ${error.message}`);
      }
      const { error } = await supabaseAdmin.from("clients").delete().in("id", clientIds);
      if (error) throw new Error(`Could not delete client record: ${error.message}`);
    } else if (clientIds.length && data.profileId) {
      const { error } = await supabaseAdmin.from("clients").update({ profile_id: null }).eq("profile_id", data.profileId);
      if (error) throw new Error(`Could not unlink client record: ${error.message}`);
    }

    if (data.profileId) {
      await supabaseAdmin.from("saved_projects").delete().eq("user_id", data.profileId);
      const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(data.profileId);
      if (delErr) throw new Error(delErr.message);
      await supabaseAdmin.from("profiles").delete().eq("id", data.profileId);
    }

    await supabaseAdmin.from("admin_audit_log").insert({
      admin_email: adminEmail, action: "delete_account", target_email: targetEmail,
      details: { mode: data.mode, profile_id: data.profileId ?? null, client_ids: clientIds },
    });
    return { ok: true as const };
  });
