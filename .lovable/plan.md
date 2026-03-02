

## Google OAuth Fix for bario.icu

### The Problem
The managed OAuth bridge (`lovable.auth.signInWithOAuth`) routes through `oauth.lovable.app/callback` and `era-remix-studio.lovable.app/~oauth/callback`. On your custom domain `bario.icu`, this causes `redirect_uri_mismatch` errors because Google doesn't recognize those callback URLs unless they're added to your Google Cloud Console.

### What You Should Do

**You have two options:**

#### Option A: Use the Managed Bridge (easiest)
Keep the current code as-is and add **all three** redirect URIs to your Google Cloud Console OAuth client:
- `https://oauth.lovable.app/callback`
- `https://era-remix-studio.lovable.app/~oauth/callback`  
- `https://bario.icu/~oauth/callback`

Then check all three in Cloud Auth Settings. **No code changes needed.**

#### Option B: Bypass the Bridge on Custom Domain (recommended for full control)
Update `signInWithGoogle` and `signInWithApple` to detect when running on `bario.icu` and call Supabase directly with `skipBrowserRedirect: true`, while keeping the managed bridge for Lovable preview/published domains.

This way, on `bario.icu` the redirect goes straight to Google → back to `bario.icu/dashboard`, and you only need `https://bario.icu/**` in your Google Cloud Console.

### Recommended: Option B

**Changes:**
1. **`src/contexts/AuthContext.tsx`** — Update `signInWithGoogle` and `signInWithApple`:
   - Detect custom domain (`!hostname.includes('lovable.app') && !hostname.includes('lovableproject.com')`)
   - On custom domain: use `supabase.auth.signInWithOAuth` with `skipBrowserRedirect: true` and manually redirect
   - On Lovable domains: keep using `lovable.auth.signInWithOAuth` as currently implemented

2. **Google Cloud Console** — You only need to add:
   - `https://bario.icu` as Authorized JavaScript Origin
   - `https://sufbohhsxlrefkoubmed.supabase.co/auth/v1/callback` as Authorized Redirect URI

3. **Backend config** — Ensure `https://bario.icu` is set as Site URL and `https://bario.icu/**` is in Redirect URLs

### Technical Detail
The PWA already has `navigateFallbackDenylist: [/^\/~oauth/]` configured, so OAuth callbacks won't be intercepted by the service worker.

