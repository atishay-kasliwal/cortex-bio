import { createFileRoute, redirect } from "@tanstack/react-router";

// Back-compat redirect so existing /login deep links land on /auth/login.
export const Route = createFileRoute("/login")({
  beforeLoad: () => {
    throw redirect({ to: "/auth/login" });
  },
});
