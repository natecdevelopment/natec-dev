import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "My account — Natec Development Ltd." },
      { name: "description", content: "Your Natec Development account." },
      { property: "og:title", content: "My account — Natec Development Ltd." },
      { property: "og:description", content: "Your Natec Development account." },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  return (
    <section className="flex min-h-[70vh] items-center justify-center bg-ivory px-4 py-16">
      <div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-8 text-center shadow-2xl">
        <h1 className="text-3xl text-navy">My account</h1>
        <p className="text-navy/80">Signed in as <strong>{user.email}</strong></p>
        <button onClick={signOut} className="btn btn-primary w-full">Sign out</button>
      </div>
    </section>
  );
}
