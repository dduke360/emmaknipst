# Environment Variables Setup

## How it works

1. `supabase.js` has placeholder values: `%SUPABASE_URL%` and `%SUPABASE_ANON_KEY%`
2. During Netlify build, `build.js` replaces placeholders with actual values
3. Values are set in `netlify.toml` (or Netlify dashboard)

## Setting up in Netlify Dashboard

Go to **Netlify Dashboard** → Your Site → **Site settings** → **Environment variables**:

| Variable | Value |
|----------|-------|
| SUPABASE_URL | `https://your-project-id.supabase.co` |
| SUPABASE_ANON_KEY | `your-supabase-anon-key` |
| CLOUDINARY_CLOUD_NAME | `your-cloudinary-cloud-name` |
| CLOUDINARY_UPLOAD_PRESET | `your-cloudinary-upload-preset` |

## Current Setup

`netlify.toml` does not contain hardcoded credentials anymore.
Set all required variables in Netlify (or your CI/CD environment) before deploying.

## Security Note

The Supabase "anon key" is NOT a secret - it's designed to be public. Security comes from Row Level Security (RLS) policies in your Supabase database.
