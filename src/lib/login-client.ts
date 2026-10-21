import { supabase } from "@/integrations/supabase/client";
import { signInWithIdentifier } from "@/lib/login.functions";
import { LOGIN_FAIL } from "@/lib/login-id";

/** Signs in with email, phone or username; the password is checked on the server. */
export async function signInAny(identifier: string, password: string): Promise<string | null> {
  try {
    const r = await signInWithIdentifier({ data: { identifier, password } });
    if ("error" in r) return r.error;
    const { error } = await supabase.auth.setSession({ access_token: r.access_token, refresh_token: r.refresh_token });
    return error ? LOGIN_FAIL : null;
  } catch {
    return LOGIN_FAIL;
  }
}
