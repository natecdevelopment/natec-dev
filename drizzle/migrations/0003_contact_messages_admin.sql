ALTER TABLE public.contact_submissions ADD COLUMN IF NOT EXISTS visit_date date, ADD COLUMN IF NOT EXISTS read_at timestamptz;
GRANT SELECT, UPDATE, DELETE ON public.contact_submissions TO authenticated;
CREATE POLICY "Admins read inquiries" ON public.contact_submissions FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins update inquiries" ON public.contact_submissions FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins delete inquiries" ON public.contact_submissions FOR DELETE TO authenticated USING (public.is_admin());