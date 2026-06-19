import { createFileRoute, redirect } from "@tanstack/react-router";

// Back-compat redirect so existing /signup deep links land on /auth/signup.
export const Route = createFileRoute("/signup")({
  beforeLoad: () => { throw redirect({ to: "/auth/signup" }); },
});