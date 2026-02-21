# Build script - Run before deploying
# This replaces placeholder values with environment variables

# Replace in supabase.js
sed -i 's|SUPABASE_URL_PLACEHOLDER|'"$SUPABASE_URL"'|g' supabase.js
sed -i 's|SUPABASE_ANON_KEY_PLACEHOLDER|'"$SUPABASE_ANON_KEY"'|g' supabase.js
