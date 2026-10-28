import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ── Hardcoded fallback credentials (anon/public keys – safe to embed) ──────
// These are used when Vite env variables are not available (e.g. on Render
// static site where build-time env injection sometimes fails).
const FALLBACK_URL = "https://fxqierhxyzpjbwtmpahq.supabase.co";
const FALLBACK_KEY = "sb_publishable_iRRUMfcHQJ0JaaYG9pTtzw_7aziLHRL";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  FALLBACK_URL;

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  FALLBACK_KEY;

// Always configured now — fallback guarantees real credentials
export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes("placeholder-project") &&
  !supabaseAnonKey.includes("placeholder"),
);

// Create real Supabase client
export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  },
);
