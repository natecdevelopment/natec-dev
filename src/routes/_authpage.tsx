import { useEffect, useState } from "react";
import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { AuthScreen } from "@/components/auth/AuthScreen";

export const Route = createFileRoute("/_authpage")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string } => (typeof s["redirect"] === "string" ? { redirect: s["redirect"] } : {}),
  component: AuthLayout,
});

function AuthLayout() {
  const register = useLocation({ select: (l) => l.pathname.startsWith("/register") });
  const { redirect } = Route.useSearch();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <section className="min-h-screen bg-ivory" />;
  return <><AuthScreen mode={register ? "register" : "login"} next={redirect} /><Outlet /></>;
}
