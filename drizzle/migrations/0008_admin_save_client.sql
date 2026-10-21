CREATE OR REPLACE FUNCTION public.admin_reallocate_payments(_client_id uuid) RETURNS void
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE left_amt numeric; r record; ap numeric;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT COALESCE(sum(amount), 0) INTO left_amt FROM public.payments WHERE client_id = _client_id;
  FOR r IN SELECT id, amount, paid_amount FROM public.instalments WHERE client_id = _client_id ORDER BY due_date, id LOOP
    ap := LEAST(r.amount, GREATEST(left_amt, 0));
    IF ap <> r.paid_amount THEN UPDATE public.instalments SET paid_amount = ap WHERE id = r.id; END IF;
    left_amt := left_amt - ap;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.admin_save_client(_client_id uuid, _client jsonb, _rows jsonb, _notes text, _changes jsonb)
RETURNS void LANGUAGE plpgsql SET search_path = public AS $$
DECLARE old_profile uuid; new_profile uuid; r jsonb; ex record; keep uuid[] := '{}'; nid uuid; amt numeric;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT profile_id INTO old_profile FROM public.clients WHERE id = _client_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Client not found'; END IF;

  IF _client IS NOT NULL THEN
    new_profile := NULLIF(_client->>'profile_id', '')::uuid;
    IF (_client->>'total_price')::numeric < 0 THEN RAISE EXCEPTION 'Total price cannot be negative.'; END IF;
    UPDATE public.clients SET
      full_name = _client->>'full_name', phone = _client->>'phone', email = _client->>'email', address = _client->>'address',
      status = _client->>'status', project_id = NULLIF(_client->>'project_id', '')::uuid, flat_no = _client->>'flat_no',
      floor = _client->>'floor', size_sft = NULLIF(_client->>'size_sft', '')::int, parking = (_client->>'parking')::boolean,
      total_price = (_client->>'total_price')::numeric, booking_date = NULLIF(_client->>'booking_date', '')::date,
      agreement_date = NULLIF(_client->>'agreement_date', '')::date, profile_id = new_profile
    WHERE id = _client_id;
    IF new_profile IS DISTINCT FROM old_profile THEN
      IF new_profile IS NOT NULL THEN UPDATE public.profiles SET account_type = 'client' WHERE id = new_profile; END IF;
      IF old_profile IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.clients WHERE profile_id = old_profile) THEN
        UPDATE public.profiles SET account_type = 'general' WHERE id = old_profile;
      END IF;
    END IF;
  END IF;

  IF _rows IS NOT NULL THEN
    FOR r IN SELECT * FROM jsonb_array_elements(_rows) LOOP
      amt := (r->>'amount')::numeric;
      IF amt IS NULL OR amt < 0 THEN RAISE EXCEPTION 'Every schedule row needs an amount.'; END IF;
      IF COALESCE(r->>'id', '') <> '' THEN
        SELECT * INTO ex FROM public.instalments WHERE id = (r->>'id')::uuid AND client_id = _client_id;
        IF NOT FOUND THEN RAISE EXCEPTION 'Schedule row not found.'; END IF;
        IF amt < ex.paid_amount THEN RAISE EXCEPTION 'A paid instalment cannot be reduced below the amount already paid.'; END IF;
        UPDATE public.instalments SET due_date = (r->>'due_date')::date, amount = amt, label = COALESCE(NULLIF(r->>'label', ''), 'Instalment') WHERE id = ex.id;
        keep := keep || ex.id;
      ELSE
        INSERT INTO public.instalments (client_id, due_date, amount, label)
        VALUES (_client_id, (r->>'due_date')::date, amt, COALESCE(NULLIF(r->>'label', ''), 'Instalment')) RETURNING id INTO nid;
        keep := keep || nid;
      END IF;
    END LOOP;
    IF EXISTS (SELECT 1 FROM public.instalments WHERE client_id = _client_id AND NOT (id = ANY (keep)) AND paid_amount > 0) THEN
      RAISE EXCEPTION 'Paid instalments cannot be deleted.';
    END IF;
    DELETE FROM public.instalments WHERE client_id = _client_id AND NOT (id = ANY (keep));
    PERFORM public.admin_reallocate_payments(_client_id);
  END IF;

  IF _notes IS NOT NULL THEN
    INSERT INTO public.client_notes (client_id, notes, updated_at) VALUES (_client_id, _notes, now())
    ON CONFLICT (client_id) DO UPDATE SET notes = EXCLUDED.notes, updated_at = now();
  END IF;

  INSERT INTO public.admin_audit_log (admin_email, action, target_email, details)
  VALUES (COALESCE(auth.jwt()->>'email', ''), 'update_client',
    COALESCE(_client->>'email', (SELECT email FROM public.clients WHERE id = _client_id), ''),
    jsonb_build_object('client_id', _client_id, 'changes', COALESCE(_changes, '{}'::jsonb)));
END $$;

REVOKE ALL ON FUNCTION public.admin_reallocate_payments(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_save_client(uuid, jsonb, jsonb, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reallocate_payments(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_client(uuid, jsonb, jsonb, text, jsonb) TO authenticated;