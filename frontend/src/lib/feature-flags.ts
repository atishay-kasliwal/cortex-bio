/** Feature flags — team/org UI hidden until FEATURE_ORGANIZATIONS is enabled. */
export function useFeatureFlag(flag: "organizations"): boolean {
  if (flag === "organizations") {
    return import.meta.env.VITE_FEATURE_ORGANIZATIONS === "true";
  }
  return false;
}
