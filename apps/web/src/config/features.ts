// Central feature flags for admin modules that are still placeholders.
// Flip a flag to true to show its sidebar item, keep its route reachable and
// reveal any links pointing at it. No other code changes needed.
export const FEATURES = {
  // Phase 4 — cross-product milestone workspace (/admin/milestones)
  projectsMilestones: false,
  // Phase 5 — immutable audit trail viewer (/admin/audit-logs)
  auditLogs: false,
  // Phase 5 — milestone templates and approval policy (/admin/settings)
  systemConfiguration: false,
  // Phase 5 — role and permission matrix (/admin/roles)
  rolesPermissions: false,
  // Phase 6 — portfolio analytics and reports (/admin/analytics)
  analytics: false,
} as const;

export type FeatureKey = keyof typeof FEATURES;

const ROUTE_FEATURES: Record<string, FeatureKey> = {
  "/admin/milestones": "projectsMilestones",
  "/admin/audit-logs": "auditLogs",
  "/admin/settings": "systemConfiguration",
  "/admin/roles": "rolesPermissions",
  "/admin/analytics": "analytics",
};

export function isDisabledAdminRoute(pathname: string): boolean {
  for (const [route, feature] of Object.entries(ROUTE_FEATURES)) {
    if ((pathname === route || pathname.startsWith(`${route}/`)) && !FEATURES[feature]) {
      return true;
    }
  }
  return false;
}
