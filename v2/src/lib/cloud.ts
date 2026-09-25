import { createClient } from "@supabase/supabase-js";
const url = import.meta.env.VITE_SUPABASE_URL,
  key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const cloud =
  url && key ? createClient(url, key, { auth: { flowType: "pkce" } }) : null;
export function requireCloud() {
  if (!cloud) throw new Error("Online services have not been configured.");
  return cloud;
}
export const workspaceKeys = [
  "atlas-temple-v2",
  "atlas-layouts",
  "atlas-builds",
  "atlas-favorites",
  "atlas-runs",
  "atlas-prices",
  "atlas-reduced-motion",
] as const;
export function workspaceSnapshot() {
  return Object.fromEntries(
    workspaceKeys.map((k) => [k, localStorage.getItem(k)]),
  );
}
