import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { AuthScreen } from "@/components/auth/AuthScreen";

export const Route = createFileRoute("/_auth")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string } => (typeof s["redirect"] === "string" ? { redirect: s["redirect"] } : {}),
  component: AuthLayout,
});

function AuthLayout() {
  const register = useLocation({ select: (l) => l.pathname.startsWith("/register") });
  const { redirect } = Route.useSearch();
  return <><AuthScreen mode={register ? "register" : "login"} next={redirect} /><Outlet /></>;
}
