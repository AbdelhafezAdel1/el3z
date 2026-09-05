/**
 * Supabase integration barrel.
 * Re-exports the configured Supabase client and the isSupabaseConfigured flag
 * so that consumers don't need to import from the deep lib path.
 */
export { supabase, isSupabaseConfigured } from "@/lib/supabase";
