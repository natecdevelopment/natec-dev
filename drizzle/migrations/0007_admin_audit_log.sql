CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email text NOT NULL DEFAULT coalesce(auth.jwt() ->> 'email', ''),
  action text NOT NULL,
  target_email text NOT NULL DEFAULT '',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read audit log" ON public.admin_audit_log FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins write own audit entries" ON public.admin_audit_log FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() AND lower(admin_email) = lower(coalesce(auth.jwt() ->> 'email', '')));
CREATE INDEX admin_audit_log_created_idx ON public.admin_audit_log (created_at DESC);

CREATE OR REPLACE FUNCTION public.admin_emails() RETURNS SETOF text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT lower(email) FROM public.admins WHERE public.is_admin()
$$;
REVOKE EXECUTE ON FUNCTION public.admin_emails() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_emails() TO authenticated;