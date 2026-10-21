<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Company facts (contacts, services, directors) live in src/lib/site.ts; pages read from it so details stay consistent.
- Contact inquiries are inserted from the browser into contact_submissions (anon insert-only RLS); no one can read them publicly.
- Brand colours are CSS variables in src/styles.css (--navy, --red, --ivory…) and shadcn tokens alias them; never add other accent colours.
- Home page sections live in src/components/HomeSections.tsx and are reused by inner routes so content stays in one place.
- The `desk:` variant means "not a portrait phone" so phones in landscape get the desktop hero layout.
- Projects, project stages, media and videos live in the database; public pages read published rows via publicProjectsQuery (src/lib/projects-data.ts), never hard-coded arrays.
- Admin access = signed-in email listed in public.admins, checked by public.is_admin() in RLS; the /admin layout (ssr:false) renders login/not-authorised inline and hides the public header/footer.
- The "media" storage bucket is private (workspace blocks public buckets), so uploads store a 10-year signed URL in media.public_url; seeded files point at /public paths.
- Construction Status data (construction_items/updates/update_media/subscribers) is read via src/lib/construction-data.ts; item status follows % in a DB trigger and projects.status_updated_at is touched by triggers, so the UI never sets either directly.
- Customer accounts: public.profiles (auto-created by auth trigger; a guard trigger stops non-admin users changing account_type/status) and client finance tables (clients, payments, instalments, client_documents) readable by the owner only via public.is_my_client(); balances and Overdue come from the client_balances / instalments_live views, never stored by hand.
- Admin-only client notes live in public.client_notes, not on clients, so clients can never read them through RLS.
- Portal invites run in a requireSupabaseAuth server function (src/lib/admin-accounts.functions.ts) that checks is_admin() before loading the service-role client; logins link to clients by email only after email confirmation.
- /login and /register are children of the _authpage pathless layout so the animated screen persists across the switch.
- Account deletion runs only in the deleteAccount server function (admin-checked, service role loaded in-handler); admin actions are logged to public.admin_audit_log.
- Client edits save through the admin_save_client DB function (one transaction, is_admin-checked, audit-logged); payment changes re-apply via admin_reallocate_payments — so partial saves can't happen.
- Login (site + /admin) goes through signInWithIdentifier in src/lib/login.functions.ts: email/phone/username resolved and password checked on the server, rate-limited via public.login_attempts, so the browser never learns another account's email.
- Client portal logins are created/reset only in src/lib/portal-logins.functions.ts (admin-checked, service role in-handler); temp passwords are returned once and never stored or logged; clients without email get <username>@clients.natecdev.com, treated as non-real by isSyntheticEmail.
