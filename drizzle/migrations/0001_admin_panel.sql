CREATE TABLE public.admins (email text PRIMARY KEY);
GRANT SELECT ON public.admins TO authenticated;
GRANT ALL ON public.admins TO service_role;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see own admin row" ON public.admins FOR SELECT TO authenticated USING (lower(email) = lower(auth.jwt() ->> 'email'));
INSERT INTO public.admins (email) VALUES ('natecdevelopment@gmail.com');

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.admins WHERE lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')))
$$;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

CREATE TABLE public.videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  url text NOT NULL,
  provider text NOT NULL CHECK (provider IN ('youtube','facebook')),
  video_id text NOT NULL,
  thumbnail_url text,
  sort_order int NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.videos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.videos TO authenticated;
GRANT ALL ON public.videos TO service_role;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read published videos" ON public.videos FOR SELECT TO anon, authenticated USING (published OR public.is_admin());
CREATE POLICY "Admins insert videos" ON public.videos FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins update videos" ON public.videos FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins delete videos" ON public.videos FOR DELETE TO authenticated USING (public.is_admin());

CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  project_no text NOT NULL DEFAULT '',
  kind text NOT NULL DEFAULT 'current' CHECK (kind IN ('current','upcoming')),
  address text NOT NULL DEFAULT '',
  location_short text NOT NULL DEFAULT '',
  building_type text NOT NULL DEFAULT '',
  total_flats int,
  flat_sizes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Ongoing' CHECK (status IN ('Completed','Ongoing','Upcoming')),
  progress_pct int NOT NULL DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  availability text NOT NULL DEFAULT 'Available' CHECK (availability IN ('Available','Few left','Sold out','Coming soon')),
  handover_date text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  features text[] NOT NULL DEFAULT '{}',
  map_url text NOT NULL DEFAULT '',
  cover_media_id uuid,
  sort_order int NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.projects TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read published projects" ON public.projects FOR SELECT TO anon, authenticated USING (published OR public.is_admin());
CREATE POLICY "Admins insert projects" ON public.projects FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins update projects" ON public.projects FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins delete projects" ON public.projects FOR DELETE TO authenticated USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.project_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  stage text NOT NULL CHECK (stage IN ('Excavation','Foundation','Structure','Brickwork','Finishing','Handover')),
  status text NOT NULL DEFAULT 'Not started' CHECK (status IN ('Done','In progress','Not started')),
  completed_on date,
  note text NOT NULL DEFAULT '',
  sort_order int NOT NULL DEFAULT 0
);
GRANT SELECT ON public.project_stages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_stages TO authenticated;
GRANT ALL ON public.project_stages TO service_role;
ALTER TABLE public.project_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read stages of published projects" ON public.project_stages FOR SELECT TO anon, authenticated USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.published));
CREATE POLICY "Admins insert stages" ON public.project_stages FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins update stages" ON public.project_stages FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins delete stages" ON public.project_stages FOR DELETE TO authenticated USING (public.is_admin());

CREATE TABLE public.media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path text,
  public_url text NOT NULL,
  file_name text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  alt_text text NOT NULL DEFAULT '',
  caption text NOT NULL DEFAULT '',
  width int,
  height int,
  size_bytes bigint,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.media TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media TO authenticated;
GRANT ALL ON public.media TO service_role;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read media" ON public.media FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins insert media" ON public.media FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins update media" ON public.media FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins delete media" ON public.media FOR DELETE TO authenticated USING (public.is_admin());

ALTER TABLE public.projects ADD CONSTRAINT projects_cover_media_fk FOREIGN KEY (cover_media_id) REFERENCES public.media(id) ON DELETE RESTRICT;

CREATE POLICY "Public read media bucket" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'media');
CREATE POLICY "Admins upload media bucket" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'media' AND public.is_admin());
CREATE POLICY "Admins update media bucket" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'media' AND public.is_admin());
CREATE POLICY "Admins delete media bucket" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'media' AND public.is_admin());

INSERT INTO public.projects (id, slug, name, project_no, kind, address, location_short, building_type, total_flats, status, progress_pct, availability, sort_order, published) VALUES
 ('11111111-0000-4000-8000-000000000001','shobuj-angon','Shobuj Angon','Project 01','current','Padma Gate, Rajendrapur Bazar, Sreepur, Gazipur','Rajendrapur Bazar, Sreepur','B+G+7 (8-storey)',28,'Completed',100,'Sold out',1,true),
 ('11111111-0000-4000-8000-000000000002','shobuj-aloy','Shobuj Aloy','Project 02','current','Padma Gate, Rajendrapur Bazar, Sreepur, Gazipur','Rajendrapur Bazar, Sreepur','G+7 (8-storey)',21,'Ongoing',50,'Sold out',2,true),
 ('11111111-0000-4000-8000-000000000003','shobuj-digonto','Shobuj Digonto','Project 03','current','Pepsi Gate, Rajendrapur Bazar, Sreepur, Gazipur','Rajendrapur Bazar, Sreepur','B+G+6 (7-storey)',26,'Ongoing',20,'Sold out',3,true),
 ('11111111-0000-4000-8000-000000000004','upcoming-rajendrapur-bazar','Upcoming Project — Rajendrapur Bazar','','upcoming','Rajendrapur Bazar, Sreepur, Gazipur','Rajendrapur Bazar, Sreepur, Gazipur','',NULL,'Upcoming',0,'Coming soon',4,true),
 ('11111111-0000-4000-8000-000000000005','upcoming-gazipur','Upcoming Project — Gazipur','','upcoming','Gazipur','Gazipur','',NULL,'Upcoming',0,'Coming soon',5,true);

INSERT INTO public.media (id, storage_path, public_url, file_name, title, alt_text, width, height, size_bytes, project_id, sort_order) VALUES
 ('22222222-0000-4000-8000-000000000001',NULL,'/projects/shobuj-angon/front.webp','front.webp','Shobuj Angon — front','Shobuj Angon, Padma Gate, Rajendrapur Bazar, Sreepur, Gazipur — front view',1400,1400,160642,'11111111-0000-4000-8000-000000000001',1),
 ('22222222-0000-4000-8000-000000000002',NULL,'/projects/shobuj-angon/side.webp','side.webp','Shobuj Angon — side','Shobuj Angon, Padma Gate, Rajendrapur Bazar, Sreepur, Gazipur — side view',1400,1400,156278,'11111111-0000-4000-8000-000000000001',2),
 ('22222222-0000-4000-8000-000000000003',NULL,'/projects/shobuj-angon/corner.webp','corner.webp','Shobuj Angon — corner','Shobuj Angon, Padma Gate, Rajendrapur Bazar, Sreepur, Gazipur — corner view',1400,1400,162694,'11111111-0000-4000-8000-000000000001',3),
 ('22222222-0000-4000-8000-000000000004',NULL,'/projects/shobuj-angon/aerial.webp','aerial.webp','Shobuj Angon — aerial','Shobuj Angon, Padma Gate, Rajendrapur Bazar, Sreepur, Gazipur — aerial view',1400,1400,231452,'11111111-0000-4000-8000-000000000001',4),
 ('22222222-0000-4000-8000-000000000005',NULL,'/projects/shobuj-aloy/front.webp','front.webp','Shobuj Aloy — front','Shobuj Aloy, Padma Gate, Rajendrapur Bazar, Sreepur, Gazipur — front view',896,1200,180618,'11111111-0000-4000-8000-000000000002',1),
 ('22222222-0000-4000-8000-000000000006',NULL,'/projects/shobuj-digonto/front.webp','front.webp','Shobuj Digonto — front','Shobuj Digonto, Pepsi Gate, Rajendrapur Bazar, Sreepur, Gazipur — front view',1400,1400,222916,'11111111-0000-4000-8000-000000000003',1),
 ('22222222-0000-4000-8000-000000000007',NULL,'/projects/shobuj-digonto/aerial.webp','aerial.webp','Shobuj Digonto — aerial','Shobuj Digonto, Pepsi Gate, Rajendrapur Bazar, Sreepur, Gazipur — aerial view',1400,1400,331068,'11111111-0000-4000-8000-000000000003',2),
 ('22222222-0000-4000-8000-000000000008',NULL,'/projects/upcoming/rajendrapur-bazar.webp','rajendrapur-bazar.webp','Upcoming project — Rajendrapur Bazar','Upcoming Natec project, Rajendrapur Bazar, Sreepur, Gazipur — night render',1063,1280,229610,'11111111-0000-4000-8000-000000000004',1),
 ('22222222-0000-4000-8000-000000000009',NULL,'/projects/upcoming/gazipur.webp','gazipur.webp','Upcoming project — Gazipur','Upcoming Natec project, Gazipur — day render',1130,1280,325196,'11111111-0000-4000-8000-000000000005',1);

UPDATE public.projects SET cover_media_id = '22222222-0000-4000-8000-000000000001' WHERE id = '11111111-0000-4000-8000-000000000001';
UPDATE public.projects SET cover_media_id = '22222222-0000-4000-8000-000000000005' WHERE id = '11111111-0000-4000-8000-000000000002';
UPDATE public.projects SET cover_media_id = '22222222-0000-4000-8000-000000000006' WHERE id = '11111111-0000-4000-8000-000000000003';
UPDATE public.projects SET cover_media_id = '22222222-0000-4000-8000-000000000008' WHERE id = '11111111-0000-4000-8000-000000000004';
UPDATE public.projects SET cover_media_id = '22222222-0000-4000-8000-000000000009' WHERE id = '11111111-0000-4000-8000-000000000005';

INSERT INTO public.project_stages (project_id, stage, status, sort_order)
SELECT p.id, s.stage,
  CASE WHEN p.progress_pct >= s.threshold THEN 'Done' WHEN p.progress_pct >= s.threshold - 20 THEN 'In progress' ELSE 'Not started' END,
  s.ord
FROM public.projects p
CROSS JOIN (VALUES ('Excavation',10,1),('Foundation',20,2),('Structure',55,3),('Brickwork',75,4),('Finishing',95,5),('Handover',100,6)) AS s(stage, threshold, ord)
WHERE p.kind = 'current';