import { createClient } from '@supabase/supabase-js'

const SUPA_KEY = import.meta.env.VITE_SUPABASE_KEY;
const SUPA_URL = import.meta.env.VITE_SUPABASE_URL;
if (SUPA_KEY == "") {
  throw new Error('SUPABASE_KEY is not defined');
}
if (SUPA_URL == "") {
  throw new Error('SUPABASE_URL is not defined');
}
export const supabase = createClient(SUPA_URL, SUPA_KEY);
