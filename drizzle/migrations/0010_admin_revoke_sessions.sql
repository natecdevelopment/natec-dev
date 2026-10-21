CREATE OR REPLACE FUNCTION public.admin_revoke_sessions(_uid uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM auth.sessions WHERE user_id = _uid;
$$;
REVOKE ALL ON FUNCTION public.admin_revoke_sessions(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revoke_sessions(uuid) TO service_role;