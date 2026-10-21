ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS expected_completion text NOT NULL DEFAULT '';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS status_updated_at timestamptz;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS status_details_published boolean NOT NULL DEFAULT false;

CREATE TABLE public.construction_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('Structure','Masonry & plaster','Electrical, plumbing & services','Finishing','Common facilities')),
  name text NOT NULL,
  progress_pct integer NOT NULL DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  status text NOT NULL DEFAULT 'Not started' CHECK (status IN ('Done','In progress','Not started','Not applicable')),
  sort_order integer NOT NULL DEFAULT 0
);
CREATE INDEX ON public.construction_items(project_id);
GRANT SELECT ON public.construction_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.construction_items TO authenticated;
GRANT ALL ON public.construction_items TO service_role;
ALTER TABLE public.construction_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read items of published reports" ON public.construction_items FOR SELECT TO anon, authenticated
  USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.published AND p.status_details_published));
CREATE POLICY "Admins insert items" ON public.construction_items FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins update items" ON public.construction_items FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins delete items" ON public.construction_items FOR DELETE TO authenticated USING (public.is_admin());

CREATE TABLE public.construction_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  month date NOT NULL,
  title text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.construction_updates(project_id);
GRANT SELECT ON public.construction_updates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.construction_updates TO authenticated;
GRANT ALL ON public.construction_updates TO service_role;
ALTER TABLE public.construction_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read updates of published projects" ON public.construction_updates FOR SELECT TO anon, authenticated
  USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.published));
CREATE POLICY "Admins insert updates" ON public.construction_updates FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins update updates" ON public.construction_updates FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins delete updates" ON public.construction_updates FOR DELETE TO authenticated USING (public.is_admin());

CREATE TABLE public.construction_update_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  update_id uuid NOT NULL REFERENCES public.construction_updates(id) ON DELETE CASCADE,
  media_id uuid NOT NULL REFERENCES public.media(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0
);
CREATE INDEX ON public.construction_update_media(update_id);
GRANT SELECT ON public.construction_update_media TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.construction_update_media TO authenticated;
GRANT ALL ON public.construction_update_media TO service_role;
ALTER TABLE public.construction_update_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read update photos of published projects" ON public.construction_update_media FOR SELECT TO anon, authenticated
  USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.construction_updates u JOIN public.projects p ON p.id = u.project_id WHERE u.id = update_id AND p.published));
CREATE POLICY "Admins insert update photos" ON public.construction_update_media FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins update update photos" ON public.construction_update_media FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins delete update photos" ON public.construction_update_media FOR DELETE TO authenticated USING (public.is_admin());

CREATE TABLE public.construction_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  phone text NOT NULL CHECK (char_length(phone) BETWEEN 6 AND 20),
  email text CHECK (email IS NULL OR char_length(email) <= 200),
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.construction_subscribers TO anon;
GRANT SELECT, INSERT, DELETE ON public.construction_subscribers TO authenticated;
GRANT ALL ON public.construction_subscribers TO service_role;
ALTER TABLE public.construction_subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can subscribe" ON public.construction_subscribers FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins read subscribers" ON public.construction_subscribers FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins delete subscribers" ON public.construction_subscribers FOR DELETE TO authenticated USING (public.is_admin());

-- Status follows % unless Not applicable
CREATE OR REPLACE FUNCTION public.construction_item_status() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status <> 'Not applicable' THEN
    NEW.status := CASE WHEN NEW.progress_pct >= 100 THEN 'Done' WHEN NEW.progress_pct > 0 THEN 'In progress' ELSE 'Not started' END;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER construction_item_status BEFORE INSERT OR UPDATE ON public.construction_items FOR EACH ROW EXECUTE FUNCTION public.construction_item_status();

-- Touch projects.status_updated_at
CREATE OR REPLACE FUNCTION public.touch_project_status() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pid uuid;
BEGIN
  IF TG_TABLE_NAME = 'construction_update_media' THEN
    SELECT project_id INTO pid FROM construction_updates WHERE id = COALESCE(NEW.update_id, OLD.update_id);
  ELSIF TG_OP = 'DELETE' THEN pid := OLD.project_id;
  ELSE pid := NEW.project_id; END IF;
  IF pid IS NOT NULL THEN UPDATE projects SET status_updated_at = now() WHERE id = pid; END IF;
  RETURN NULL;
END $$;
REVOKE EXECUTE ON FUNCTION public.touch_project_status() FROM anon, authenticated, public;
CREATE TRIGGER touch_status_items AFTER INSERT OR UPDATE OR DELETE ON public.construction_items FOR EACH ROW EXECUTE FUNCTION public.touch_project_status();
CREATE TRIGGER touch_status_updates AFTER INSERT OR UPDATE OR DELETE ON public.construction_updates FOR EACH ROW EXECUTE FUNCTION public.touch_project_status();
CREATE TRIGGER touch_status_update_media AFTER INSERT OR UPDATE OR DELETE ON public.construction_update_media FOR EACH ROW EXECUTE FUNCTION public.touch_project_status();

CREATE OR REPLACE FUNCTION public.touch_project_status_self() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.expected_completion IS DISTINCT FROM OLD.expected_completion OR NEW.progress_pct IS DISTINCT FROM OLD.progress_pct OR NEW.status_details_published IS DISTINCT FROM OLD.status_details_published THEN
    NEW.status_updated_at := now();
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER touch_status_self BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.touch_project_status_self();

-- Backfill: standard work list for every current project
INSERT INTO public.construction_items (project_id, category, name, sort_order, progress_pct, status)
SELECT p.id, w.category, w.name, w.ord,
  CASE WHEN p.slug = 'shobuj-angon' AND w.name NOT IN ('Gas line','Roof top garden','Landscaping') THEN 100 ELSE 0 END,
  CASE WHEN p.slug = 'shobuj-angon' AND w.name IN ('Gas line','Roof top garden','Landscaping') THEN 'Not applicable' ELSE 'Not started' END
FROM public.projects p
CROSS JOIN (VALUES
 ('Structure','Soil test & site preparation',1),('Structure','Piling / foundation',2),('Structure','Basement & ground floor structure',3),('Structure','Super structure (columns, beams, slabs)',4),('Structure','Roof casting',5),
 ('Masonry & plaster','Brickwork',6),('Masonry & plaster','Inside plaster',7),('Masonry & plaster','Outside plaster',8),
 ('Electrical, plumbing & services','Electrical conduit',9),('Electrical, plumbing & services','Electrical wiring',10),('Electrical, plumbing & services','Switch & socket fitting',11),('Electrical, plumbing & services','Sanitary & plumbing lines',12),('Electrical, plumbing & services','Water reservoir & pump',13),('Electrical, plumbing & services','Gas line',14),('Electrical, plumbing & services','Fire safety system',15),('Electrical, plumbing & services','Lift installation',16),('Electrical, plumbing & services','Generator & substation',17),
 ('Finishing','Door frames',18),('Finishing','Door shutters',19),('Finishing','Aluminium windows & glass',20),('Finishing','Grill & railing',21),('Finishing','Floor tiles',22),('Finishing','Bathroom & kitchen wall tiles',23),('Finishing','Kitchen platform',24),('Finishing','Sanitary fittings (commode, basin, C.P.)',25),('Finishing','Inside paint',26),('Finishing','Outside paint',27),('Finishing','Roof top finishing',28),
 ('Common facilities','Boundary wall & main gate',29),('Common facilities','Ground floor & car parking',30),('Common facilities','Lobby & reception',31),('Common facilities','Roof top garden',32),('Common facilities','Landscaping',33)
) AS w(category, name, ord)
WHERE p.kind = 'current';

UPDATE public.projects SET status_details_published = true, expected_completion = 'Completed' WHERE slug = 'shobuj-angon';
UPDATE public.projects SET status_updated_at = now() WHERE kind = 'current';