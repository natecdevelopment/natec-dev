-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  account_type text NOT NULL DEFAULT 'general' CHECK (account_type IN ('general','client')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own profile or admin" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "Update own profile or admin" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_admin()) WITH CHECK (id = auth.uid() OR public.is_admin());

-- Non-admins may only change full_name, phone, last_seen_at
CREATE OR REPLACE FUNCTION public.profiles_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    NEW.id := OLD.id; NEW.email := OLD.email; NEW.account_type := OLD.account_type;
    NEW.status := OLD.status; NEW.created_at := OLD.created_at;
  END IF;
  NEW.full_name := left(trim(NEW.full_name), 120);
  NEW.phone := left(trim(NEW.phone), 20);
  RETURN NEW;
END $$;
CREATE TRIGGER profiles_guard BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.profiles_guard();

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone)
  VALUES (NEW.id, COALESCE(NEW.email,''), left(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),120), left(COALESCE(NEW.raw_user_meta_data->>'phone',''),20))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing users
INSERT INTO public.profiles (id, email, full_name)
SELECT id, COALESCE(email,''), COALESCE(raw_user_meta_data->>'full_name','') FROM auth.users ON CONFLICT DO NOTHING;

-- SAVED PROJECTS
CREATE TABLE public.saved_projects (
  user_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, project_id)
);
GRANT SELECT, INSERT, DELETE ON public.saved_projects TO authenticated;
GRANT ALL ON public.saved_projects TO service_role;
ALTER TABLE public.saved_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own saved projects read" ON public.saved_projects FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "Own saved projects insert" ON public.saved_projects FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own saved projects delete" ON public.saved_projects FOR DELETE TO authenticated USING (user_id = auth.uid());

-- CLIENTS
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  flat_no text NOT NULL DEFAULT '',
  floor text NOT NULL DEFAULT '',
  size_sft integer,
  parking boolean NOT NULL DEFAULT false,
  total_price numeric(14,2) NOT NULL DEFAULT 0 CHECK (total_price >= 0),
  booking_date date,
  agreement_date date,
  payment_plan_note text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.clients(profile_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- admin-only notes kept apart so clients can never read them
CREATE TABLE public.client_notes (
  client_id uuid PRIMARY KEY REFERENCES public.clients(id) ON DELETE CASCADE,
  notes text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_notes TO authenticated;
GRANT ALL ON public.client_notes TO service_role;
ALTER TABLE public.client_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage client notes" ON public.client_notes FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.is_my_client(_client_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM clients c JOIN profiles p ON p.id = c.profile_id
    WHERE c.id = _client_id AND c.profile_id = auth.uid() AND p.status = 'active' AND p.account_type = 'client'
  )
$$;
GRANT EXECUTE ON FUNCTION public.is_my_client(uuid) TO authenticated;

CREATE POLICY "Clients read own record, admins all" ON public.clients FOR SELECT TO authenticated USING (public.is_admin() OR public.is_my_client(id));
CREATE POLICY "Admins insert clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins update clients" ON public.clients FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins delete clients" ON public.clients FOR DELETE TO authenticated USING (public.is_admin());

-- PAYMENTS
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  paid_on date NOT NULL DEFAULT current_date,
  type text NOT NULL DEFAULT 'Instalment' CHECK (type IN ('Booking money','Down payment','Instalment','Car parking','Other')),
  method text NOT NULL DEFAULT 'Cash' CHECK (method IN ('Cash','Bank','Cheque','bKash','Nagad','Other')),
  reference text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  recorded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.payments(client_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clients read own payments, admins all" ON public.payments FOR SELECT TO authenticated USING (public.is_admin() OR public.is_my_client(client_id));
CREATE POLICY "Admins insert payments" ON public.payments FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins update payments" ON public.payments FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins delete payments" ON public.payments FOR DELETE TO authenticated USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.stamp_change() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  IF TG_TABLE_NAME = 'payments' THEN NEW.recorded_by := auth.uid(); END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER payments_stamp BEFORE INSERT OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.stamp_change();
CREATE TRIGGER clients_stamp BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.stamp_change();

-- INSTALMENTS
CREATE TABLE public.instalments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  due_date date NOT NULL,
  amount numeric(14,2) NOT NULL CHECK (amount >= 0),
  label text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Upcoming' CHECK (status IN ('Upcoming','Paid','Partly paid','Overdue')),
  paid_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0)
);
CREATE INDEX ON public.instalments(client_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.instalments TO authenticated;
GRANT ALL ON public.instalments TO service_role;
ALTER TABLE public.instalments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clients read own instalments, admins all" ON public.instalments FOR SELECT TO authenticated USING (public.is_admin() OR public.is_my_client(client_id));
CREATE POLICY "Admins insert instalments" ON public.instalments FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins update instalments" ON public.instalments FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins delete instalments" ON public.instalments FOR DELETE TO authenticated USING (public.is_admin());

-- status follows paid amount and due date
CREATE OR REPLACE FUNCTION public.instalment_status() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.status := CASE
    WHEN NEW.paid_amount >= NEW.amount THEN 'Paid'
    WHEN NEW.due_date < current_date THEN 'Overdue'
    WHEN NEW.paid_amount > 0 THEN 'Partly paid'
    ELSE 'Upcoming' END;
  RETURN NEW;
END $$;
CREATE TRIGGER instalment_status BEFORE INSERT OR UPDATE ON public.instalments FOR EACH ROW EXECUTE FUNCTION public.instalment_status();

-- Effective view (Overdue computed live from today's date)
CREATE VIEW public.instalments_live WITH (security_invoker = true) AS
SELECT i.id, i.client_id, i.due_date, i.amount, i.label, i.paid_amount,
  CASE WHEN i.paid_amount >= i.amount THEN 'Paid'
       WHEN i.due_date < current_date THEN 'Overdue'
       WHEN i.paid_amount > 0 THEN 'Partly paid'
       ELSE 'Upcoming' END AS status
FROM public.instalments i;
GRANT SELECT ON public.instalments_live TO authenticated;

CREATE VIEW public.client_balances WITH (security_invoker = true) AS
SELECT c.id AS client_id, c.total_price,
  COALESCE(p.total_paid, 0) AS total_paid,
  c.total_price - COALESCE(p.total_paid, 0) AS amount_due,
  CASE WHEN c.total_price > 0 THEN round(COALESCE(p.total_paid,0) * 100 / c.total_price, 1) ELSE 0 END AS pct_paid,
  lp.paid_on AS last_payment_on, lp.amount AS last_payment_amount,
  ni.due_date AS next_due_date, ni.remaining AS next_due_amount,
  COALESCE(od.overdue, 0) AS overdue_amount
FROM public.clients c
LEFT JOIN LATERAL (SELECT sum(amount) AS total_paid FROM public.payments WHERE client_id = c.id) p ON true
LEFT JOIN LATERAL (SELECT paid_on, amount FROM public.payments WHERE client_id = c.id ORDER BY paid_on DESC, created_at DESC LIMIT 1) lp ON true
LEFT JOIN LATERAL (SELECT due_date, amount - paid_amount AS remaining FROM public.instalments WHERE client_id = c.id AND paid_amount < amount ORDER BY due_date LIMIT 1) ni ON true
LEFT JOIN LATERAL (SELECT sum(amount - paid_amount) AS overdue FROM public.instalments WHERE client_id = c.id AND paid_amount < amount AND due_date < current_date) od ON true;
GRANT SELECT ON public.client_balances TO authenticated;

-- DOCUMENTS
CREATE TABLE public.client_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title text NOT NULL,
  storage_path text NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_documents TO authenticated;
GRANT ALL ON public.client_documents TO service_role;
ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clients read own docs, admins all" ON public.client_documents FOR SELECT TO authenticated USING (public.is_admin() OR public.is_my_client(client_id));
CREATE POLICY "Admins insert docs" ON public.client_documents FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins update docs" ON public.client_documents FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins delete docs" ON public.client_documents FOR DELETE TO authenticated USING (public.is_admin());

-- Link a confirmed login to a client record with the same email (invite flow)
CREATE OR REPLACE FUNCTION public.link_client_on_confirm() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND NEW.email IS NOT NULL THEN
    UPDATE public.clients SET profile_id = NEW.id WHERE profile_id IS NULL AND email <> '' AND lower(email) = lower(NEW.email);
    IF FOUND THEN UPDATE public.profiles SET account_type = 'client' WHERE id = NEW.id; END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.link_client_on_confirm() FROM anon, authenticated, public;
CREATE TRIGGER on_auth_user_confirmed AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users FOR EACH ROW EXECUTE FUNCTION public.link_client_on_confirm();

-- Admin account list with verification flag
CREATE OR REPLACE FUNCTION public.admin_accounts() RETURNS TABLE (id uuid, full_name text, phone text, email text, account_type text, status text, created_at timestamptz, last_seen_at timestamptz, email_verified boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN QUERY SELECT p.id, p.full_name, p.phone, p.email, p.account_type, p.status, p.created_at, p.last_seen_at, (u.email_confirmed_at IS NOT NULL)
  FROM public.profiles p LEFT JOIN auth.users u ON u.id = p.id ORDER BY p.created_at DESC;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_accounts() TO authenticated;

-- INQUIRIES from signed-in users
ALTER TABLE public.contact_submissions ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.contact_submissions ADD COLUMN IF NOT EXISTS subject text NOT NULL DEFAULT '';
ALTER TABLE public.contact_submissions ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'New' CHECK (status IN ('New','In progress','Answered'));
DROP POLICY IF EXISTS "Anyone can submit an inquiry" ON public.contact_submissions;
CREATE POLICY "Anyone can submit an inquiry" ON public.contact_submissions FOR INSERT TO anon, authenticated WITH CHECK (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "Users read own inquiries" ON public.contact_submissions FOR SELECT TO authenticated USING (user_id = auth.uid());

-- STORAGE policies for client-docs bucket (path: <client_id>/<file>)
CREATE POLICY "client-docs admin all" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'client-docs' AND public.is_admin()) WITH CHECK (bucket_id = 'client-docs' AND public.is_admin());
CREATE POLICY "client-docs client read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'client-docs' AND public.is_my_client(((storage.foldername(name))[1])::uuid));