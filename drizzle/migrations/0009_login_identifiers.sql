CREATE OR REPLACE FUNCTION public.normalize_bd_phone(_p text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT CASE WHEN m IS NULL THEN coalesce(trim(_p),'') ELSE '0'||m[1] END
  FROM (SELECT regexp_match(regexp_replace(coalesce(_p,''),'[\s\-]','','g'), '^(?:\+?880|0)?(1[3-9]\d{8})$') m) x
$$;

CREATE OR REPLACE FUNCTION public.unique_username(_base text) RETURNS text LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE b text := left(regexp_replace(lower(coalesce(_base,'')),'[^a-z0-9._]','','g'),26); c text; n int := 1;
BEGIN
  IF length(b) < 3 THEN b := rpad(b || 'user', 4, '0'); END IF;
  c := b;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = c) LOOP n := n + 1; c := b || n; END LOOP;
  RETURN c;
END $$;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;

UPDATE public.profiles SET phone = public.normalize_bd_phone(phone);
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT id, email FROM public.profiles WHERE username IS NULL ORDER BY created_at LOOP
    UPDATE public.profiles SET username = public.unique_username(split_part(r.email,'@',1)) WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_format CHECK (username ~ '^[a-z0-9._]{3,30}$');
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_key ON public.profiles (username);
CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_key ON public.profiles (phone) WHERE phone <> '';

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE u text := lower(coalesce(NEW.raw_user_meta_data->>'username',''));
BEGIN
  IF u !~ '^[a-z0-9._]{3,30}$' OR EXISTS (SELECT 1 FROM public.profiles WHERE username = u) THEN
    u := public.unique_username(coalesce(nullif(u,''), split_part(coalesce(NEW.email,''),'@',1)));
  END IF;
  INSERT INTO public.profiles (id, email, full_name, phone, username, must_change_password)
  VALUES (NEW.id, COALESCE(NEW.email,''), left(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),120),
    public.normalize_bd_phone(left(COALESCE(NEW.raw_user_meta_data->>'phone',''),20)), u,
    coalesce((NEW.raw_app_meta_data->>'must_change_password')::boolean, false))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.profiles_guard() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
  IF current_user IN ('authenticated', 'anon') AND NOT public.is_admin() THEN
    NEW.id := OLD.id; NEW.email := OLD.email; NEW.account_type := OLD.account_type;
    NEW.status := OLD.status; NEW.created_at := OLD.created_at;
    IF NEW.must_change_password AND NOT OLD.must_change_password THEN NEW.must_change_password := false; END IF;
  END IF;
  NEW.full_name := left(trim(NEW.full_name), 120);
  NEW.phone := public.normalize_bd_phone(left(trim(NEW.phone), 20));
  NEW.username := lower(trim(NEW.username));
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.username_available(_u text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT lower(_u) ~ '^[a-z0-9._]{3,30}$' AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE username = lower(_u))
$$;
CREATE OR REPLACE FUNCTION public.phone_available(_p text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles WHERE phone = public.normalize_bd_phone(_p) AND phone <> '')
$$;
GRANT EXECUTE ON FUNCTION public.username_available(text), public.phone_available(text) TO anon, authenticated;

CREATE TABLE public.login_attempts (
  id bigserial PRIMARY KEY,
  identifier text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.login_attempts TO service_role;
GRANT USAGE ON SEQUENCE public.login_attempts_id_seq TO service_role;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
CREATE INDEX login_attempts_ident_idx ON public.login_attempts (identifier, created_at);