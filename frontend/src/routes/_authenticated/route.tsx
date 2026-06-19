import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { cortexApi } from "@/lib/api/services";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth/login", search: { redirect: location.href } });
    }

    try {
      await cortexApi.provision();
    } catch (e) {
      console.error("[onboarding] provision failed", e);
    }

    return { user: data.user };
  },
  component: () => <Outlet />,
});