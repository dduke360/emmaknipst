# Environment Variables Setup

## How it works

1. `supabase.js` has placeholder values: `%SUPABASE_URL%` and `%SUPABASE_ANON_KEY%`
2. During Netlify build, `build.js` replaces placeholders with actual values
3. Values are set in `netlify.toml` (or Netlify dashboard)

## Setting up in Netlify Dashboard

Go to **Netlify Dashboard** → Your Site → **Site settings** → **Environment variables**:

| Variable | Value |
|----------|-------|
| SUPABASE_URL | `https://nvsenvgcuavdpqieknlr.supabase.co` |
| SUPABASE_ANON_KEY | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52c2VuZmdjdWF2ZHBxaWVrbmxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxNDgxNDMsImV4cCI6MjA2MTcyNDE0M30.sb_publishable_RPewkAJotF-2BDQ7fIlN7g_ZyUfUavB` |

## Current Setup

The `netlify.toml` already has the values configured, so it should work automatically when deployed.

## Security Note

The Supabase "anon key" is NOT a secret - it's designed to be public. Security comes from Row Level Security (RLS) policies in your Supabase database.
