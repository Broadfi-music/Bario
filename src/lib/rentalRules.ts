export const MULTI_HOME_INSPECTION_FEE = 3500;
export const inspectionFee = (homes: number) => homes >= 2 ? MULTI_HOME_INSPECTION_FEE : 0;
export function isAgentProfileComplete(profile: Record<string, unknown> | null | undefined) {
  if (!profile) return false;
  return String(profile.full_name ?? "").trim().length >= 2 &&
    /^\+?[0-9 ]{10,15}$/.test(String(profile.phone ?? "")) &&
    String(profile.home_address ?? "").trim().length >= 5 &&
    String(profile.email ?? "").trim().length > 3 &&
    String(profile.avatar_url ?? "").trim().length > 0;
}