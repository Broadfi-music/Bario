

## Problem

The preview shows a blank screen because the Supabase client fails to initialize — the `VITE_SUPABASE_URL` environment variable is empty/undefined. The error is: `supabaseUrl is required.`

This happened because the GitHub repo was deleted and restored, which likely caused the `.env` file (auto-generated, listed in `.gitignore`) to be lost from the dev server.

## Solution

The `.env` file is auto-managed by Lovable Cloud. It should already contain the correct values. The fix is to trigger a rebuild so the environment variables are re-injected:

1. **Make a trivial code change** to force V