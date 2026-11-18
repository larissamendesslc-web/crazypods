// A username is an alias for an Auth identity, never an authorization check.
export function adminLoginEmail(login: string) {
  const normalized = login.trim().toLowerCase();
  return normalized === "admin" ? "admin@crazy.local" : normalized;
}