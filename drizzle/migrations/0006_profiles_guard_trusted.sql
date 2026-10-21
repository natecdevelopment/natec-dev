CREATE OR REPLACE FUNCTION public.profiles_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') AND NOT public.is_admin() THEN
    NEW.id := OLD.id; NEW.email := OLD.email; NEW.account_type := OLD.account_type;
    NEW.status := OLD.status; NEW.created_at := OLD.created_at;
  END IF;
  NEW.full_name := left(trim(NEW.full_name), 120);
  NEW.phone := left(trim(NEW.phone), 20);
  RETURN NEW;
END $$;