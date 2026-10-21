import { createFileRoute, redirect } from "@tanstack/react-router";

// Old sign-in address — kept so existing links still work.
export const Route = createFileRoute("/auth")({
  beforeLoad: () => { throw redirect({ to: "/login", replace: true }); },
});
