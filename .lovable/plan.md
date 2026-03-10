

## Problem

Google Sign-In on the custom domain `bario.icu` redirects back without logging the user in. This is a known issue where the managed OAuth bridge (designed for `*.lovable.app` domains) incorrectly handles the redirect on custom domains, causing the session tokens to be lost during the callback.

## Root Cause

The `lovable.auth.signInWithOAuth` relies on the auth-bridge at `/~oauth/callback`. On custom domains like `bario.icu`, this bridge can fail silently — the user completes Google authentication but the tokens never get set in the browser session, so they land back on the site unauthenticated.

## Fix

Add a **custom domain detection** in `AuthContext.tsx` for both `signInWithGoogle` and `signInWithApple`. When running on `bario.icu` (or any non-lovable domain), bypass the managed bridge and use `supabase.auth.signInWithOAuth` directly with `skipBrowserRedirect: true`, then manually redirect to the Google OAuth URL.

### Changes

**File: `src/contexts/AuthContext.tsx`** — Update `signInWithGoogle` and `signInWithApple`:

```typescript
const signInWithGoogle = async () => {
  const isCustomDomain = !window.location.hostname.includes('lovable.app') 
    && !window.location.hostname.includes('lovableproject.com');

  if (isCustomDomain) {
    // Bypass auth-bridge on custom domains
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
        skipBrowserRedirect: true,
      },
    });
    if (error) return { error: error as Error };
    if (data?.url) {
      window.location.href = data.url;
    }
    return { error: null };
  }

  // Lovable domains use managed bridge
  const result = await lovable.auth.signInWithOAuth('google', {
    redirect_uri: window.location.origin,
  });
  return { error: result.error ? (result.error as Error) : null };
};
```

Same pattern applied to `signInWithApple`.

### Backend Configuration Required

The backend redirect URLs must include:
- `https://bario.icu/**` (for the direct Supabase OAuth callback)

This should already be configured based on the memory notes (`backend/auth-redirect-whitelist`). The Supabase callback URL (`https://sufbohhsxlrefkoubmed.supabase.co/auth/v1/callback`) also needs to be in the Google Cloud Console Authorized Redirect URIs for the direct flow to work.

### Why This Works

On `bario.icu`, the direct Supabase OAuth flow handles the callback natively via URL hash parameters. The Supabase JS client automatically picks up the session from the URL on page load via `onAuthStateChange`, so no bridge is needed.

