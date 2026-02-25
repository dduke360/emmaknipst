const SUPABASE_URL = '%SUPABASE_URL%';
const SUPABASE_ANON_KEY = '%SUPABASE_ANON_KEY%';

window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
