import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { cortexApi } from "./services";

export const queryKeys = {
  profile: ["profile"] as const,
  readiness: ["readiness", "today"] as const,
  readinessHistory: (days: number) => ["readiness", "history", days] as const,
  forecast: ["forecast"] as const,
  windows: ["windows", "today"] as const,
  insights: ["insights"] as const,
  trends: (days: number) => ["trends", days] as const,
  keys: ["api-keys"] as const,
  usage: (days: number) => ["usage", days] as const,
  providers: ["providers"] as const,
  freshness: ["freshness"] as const,
};

export function useProfile() {
  return useQuery({ queryKey: queryKeys.profile, queryFn: () => cortexApi.profile() });
}

export function useReadinessToday() {
  return useQuery({
    queryKey: queryKeys.readiness,
    queryFn: () => cortexApi.readinessToday(),
    retry: 2,
  });
}

export function useReadinessHistory(days = 7) {
  return useQuery({
    queryKey: queryKeys.readinessHistory(days),
    queryFn: () => cortexApi.readinessHistory(days),
    retry: 2,
  });
}

export function useForecast() {
  return useQuery({
    queryKey: queryKeys.forecast,
    queryFn: () => cortexApi.forecast(),
    retry: 2,
  });
}

export function useWindowsToday() {
  return useQuery({
    queryKey: queryKeys.windows,
    queryFn: () => cortexApi.windowsToday(),
    retry: 2,
  });
}

export function useInsights() {
  return useQuery({
    queryKey: queryKeys.insights,
    queryFn: async () => {
      const res = await cortexApi.insights();
      return res.insights;
    },
    retry: 2,
  });
}

export function useTrends(days = 7) {
  return useQuery({
    queryKey: queryKeys.trends(days),
    queryFn: async () => {
      const res = await cortexApi.trends(days);
      return res.trends;
    },
    retry: 2,
  });
}

export function useApiKeys() {
  return useQuery({ queryKey: queryKeys.keys, queryFn: async () => (await cortexApi.listKeys()).keys });
}

export function useUsage(days = 30) {
  return useQuery({ queryKey: queryKeys.usage(days), queryFn: () => cortexApi.usage(days) });
}

export function useProviders() {
  return useQuery({
    queryKey: queryKeys.providers,
    queryFn: async () => (await cortexApi.providers()).providers,
  });
}

export function useFreshness() {
  return useQuery({
    queryKey: queryKeys.freshness,
    queryFn: () => cortexApi.freshness(),
    refetchInterval: 60_000,
  });
}

export function useCreateApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => cortexApi.createKey(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.keys }),
  });
}

export function useRevokeApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cortexApi.revokeKey(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.keys }),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: cortexApi.updateProfile,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.profile }),
  });
}

export function useConnectProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cortexApi.connectProvider(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.providers }),
  });
}

export function useDisconnectProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cortexApi.disconnectProvider(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.providers }),
  });
}

export function useOverviewData() {
  const profile = useProfile();
  const readiness = useReadinessToday();
  const forecast = useForecast();
  const windows = useWindowsToday();
  const trends = useTrends(7);
  const history = useReadinessHistory(7);
  const freshness = useFreshness();

  const isLoading =
    profile.isLoading ||
    readiness.isLoading ||
    forecast.isLoading ||
    windows.isLoading ||
    freshness.isLoading;

  const isError =
    profile.isError ||
    readiness.isError ||
    forecast.isError ||
    windows.isError;

  const refetch = () => {
    profile.refetch();
    readiness.refetch();
    forecast.refetch();
    windows.refetch();
    trends.refetch();
    history.refetch();
    freshness.refetch();
  };

  return { profile, readiness, forecast, windows, trends, history, freshness, isLoading, isError, refetch };
}
