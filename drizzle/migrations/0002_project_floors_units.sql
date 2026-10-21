ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS total_floors integer, ADD COLUMN IF NOT EXISTS units_per_floor integer;

CREATE TABLE public.project_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT '',
  size_sqft integer,
  bedrooms integer,
  bathrooms integer,
  balconies integer,
  note text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0
);
GRANT SELECT ON public.project_units TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_units TO authenticated;
GRANT ALL ON public.project_units TO service_role;
ALTER TABLE public.project_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read units of published projects" ON public.project_units FOR SELECT TO anon, authenticated
  USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_units.project_id AND p.published));
CREATE POLICY "Admins insert units" ON public.project_units FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins update units" ON public.project_units FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins delete units" ON public.project_units FOR DELETE TO authenticated USING (public.is_admin());