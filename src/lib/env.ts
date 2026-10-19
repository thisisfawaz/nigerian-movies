/**
 * Centralized environment + feature detection.
 *
 * IMPORTANT: Every external capability is OPTIONAL and DISABLED BY DEFAULT.
 * The application must run with zero keys configured (PRD §12.1, §20).
 *
 * This module is safe to import from both server and client components;
 * only NEXT_PUBLIC_* values are exposed to the browser.
 */

export type DataMode = "supabase" | "static";

function clean(value: string | undefined): string | undefined {
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

/**
 * Reads a SERVER-ONLY env var. Safe for server components/actions; must not be
 * used for anything the client needs. Dynamic access is fine here because these
 * values are never inlined into the browser bundle.
 */
function readServerEnv(key: string): string | undefined {
  if (typeof process === "undefined") return undefined;
  return clean(process.env[key]);
}

/**
 * IMPORTANT: NEXT_PUBLIC_* values MUST be accessed as static properties
 * (process.env.NEXT_PUBLIC_X), because Next.js inlines them into the client
 * bundle by literal name. Accessing them via a computed key (process.env[key])
 * is NOT inlined and yields undefined in the browser.
 */
const supabaseUrl = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseAnonKey = clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
// Server-only: may use dynamic access, must NOT be exposed to the client.
const supabaseServiceRoleKey = clean(
  typeof process !== "undefined" ? process.env.SUPABASE_SERVICE_ROLE_KEY : undefined
);

/**
 * Public Supabase config, exposed to the browser (anon key is designed to be
 * public and is protected by Row Level Security).
 */
export const publicSupabaseConfig = {
  url: supabaseUrl,
  anonKey: supabaseAnonKey
} as const;

/**
 * Server-only Supabase config. Never import this into a client component.
 */
export const serverSupabaseConfig = {
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
  serviceRoleKey: supabaseServiceRoleKey
} as const;

/**
 * The data mode is `supabase` only when a URL and public anon key exist.
 * Otherwise the app falls back to the static file catalogue.
 */
export function getDataMode(): DataMode {
  return supabaseUrl && supabaseAnonKey ? "supabase" : "static";
}

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/**
 * The admin dashboard requires a database and an auth system. In static mode
 * there is nowhere to persist mutations, so the admin UI is disabled.
 */
export const isAdminEnabled = isSupabaseConfigured;

/**
 * The single email address authorized to access the admin dashboard.
 * Normalized to lowercase for case-insensitive comparison.
 */
export const adminEmail = clean(process.env.ADMIN_EMAIL)?.toLowerCase();

/**
 * AI categorization is opt-in. It must never be required for the app to work.
 */
export const isAiEnabled =
  readServerEnv("AI_ENABLED") === "true" && Boolean(readServerEnv("AI_API_KEY"));

export const aiConfig = {
  provider: readServerEnv("AI_PROVIDER"),
  apiKey: readServerEnv("AI_API_KEY"),
  model: readServerEnv("AI_MODEL"),
  baseUrl: readServerEnv("AI_BASE_URL")
} as const;

/**
 * Resolve the public site URL, with a safe localhost fallback so the app never
 * crashes when the variable is unset.
 */
const siteUrl = clean(process.env.NEXT_PUBLIC_SITE_URL);

export function getSiteUrl(): string {
  return siteUrl ?? "http://localhost:3000";
}
