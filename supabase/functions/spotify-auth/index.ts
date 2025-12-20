import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get Spotify client credentials
const SPOTIFY_CLIENT_ID = Deno.env.get('SPOTIFY_CLIENT_ID');
const SPOTIFY_CLIENT_SECRET = Deno.env.get('SPOTIFY_CLIENT_SECRET');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'login';

    // Get the base URL for redirects
    const origin = req.headers.get('origin') || 'https://lovable.dev';
    
    if (action === 'login') {
      // Generate OAuth login URL
      const scopes = [
        'user-read-private',
        'user-read-email',
        'user-top-read',
        'user-read-recently-played',
        'user-library-read',
        'playlist-read-private',
        'streaming',
      ].join(' ');

      const state = crypto.randomUUID();
      const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/spotify-auth?action=callback`;

      const authUrl = new URL('https://accounts.spotify.com/authorize');
      authUrl.searchParams.set('client_id', SPOTIFY_CLIENT_ID!);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('scope', scopes);
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('show_dialog', 'true');

      return new Response(JSON.stringify({ 
        authUrl: authUrl.toString(),
        state 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'callback') {
      // Handle OAuth callback
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error) {
        // Redirect to app with error
        return new Response(null, {
          status: 302,
          headers: {
            'Location': `${origin}/dashboard?spotify_error=${encodeURIComponent(error)}`
          }
        });
      }

      if (!code) {
        return new Response(JSON.stringify({ error: 'No authorization code provided' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Exchange code for tokens
      const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/spotify-auth?action=callback`;
      const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)}`
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri
        })
      });

      const tokens = await tokenResponse.json();

      if (tokens.error) {
        console.error('Token error:', tokens);
        return new Response(null, {
          status: 302,
          headers: {
            'Location': `${origin}/dashboard?spotify_error=${encodeURIComponent(tokens.error_description || tokens.error)}`
          }
        });
      }

      // Redirect to app with tokens in hash (client-side only)
      const redirectUrl = new URL(`${origin}/dashboard`);
      redirectUrl.searchParams.set('spotify_connected', 'true');
      redirectUrl.searchParams.set('spotify_token', tokens.access_token);
      redirectUrl.searchParams.set('spotify_refresh', tokens.refresh_token);
      redirectUrl.searchParams.set('spotify_expires', tokens.expires_in);

      return new Response(null, {
        status: 302,
        headers: {
          'Location': redirectUrl.toString()
        }
      });
    }

    if (action === 'refresh') {
      // Refresh access token
      const body = await req.json();
      const refreshToken = body.refresh_token;

      if (!refreshToken) {
        return new Response(JSON.stringify({ error: 'No refresh token provided' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)}`
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        })
      });

      const tokens = await tokenResponse.json();

      if (tokens.error) {
        return new Response(JSON.stringify({ error: tokens.error_description || tokens.error }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        access_token: tokens.access_token,
        expires_in: tokens.expires_in,
        refresh_token: tokens.refresh_token || refreshToken
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Client Credentials flow (no user auth needed) for general search
    if (action === 'client_token') {
      const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)}`
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials'
        })
      });

      const tokens = await tokenResponse.json();

      if (tokens.error) {
        console.error('Client credentials error:', tokens);
        return new Response(JSON.stringify({ error: tokens.error }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        access_token: tokens.access_token,
        expires_in: tokens.expires_in,
        token_type: tokens.token_type
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('Spotify auth error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
