import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';

/**
 * Central utility to always get a fresh, valid session.
 * This is the single source of truth for auth tokens on the client.
 * 
 * Returns null if no session exists (user should be redirected to login)
 * Returns a fresh session if the current one is expired or about to expire
 */
export const getFreshSession = async (): Promise<Session | null> => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error getting session:', error);
      // Try to refresh
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.error('Failed to refresh after getSession error:', refreshError);
        return null;
      }
      return refreshData.session;
    }
    
    if (!session) {
      return null;
    }
    
    // Check if token expires within the next 2 minutes
    const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
    const now = Date.now();
    const twoMinutes = 2 * 60 * 1000;
    
    if (expiresAt - now < twoMinutes) {
      console.log('Session expiring soon, refreshing...');
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.error('Failed to refresh session:', refreshError);
        // If refresh fails, sign out the user
        await supabase.auth.signOut();
        return null;
      }
      
      return refreshData.session;
    }
    
    return session;
  } catch (error) {
    console.error('Unexpected error in getFreshSession:', error);
    return null;
  }
};

/**
 * Get a fresh access token for API calls.
 * Returns null if user is not authenticated.
 */
export const getFreshAccessToken = async (): Promise<string | null> => {
  const session = await getFreshSession();
  return session?.access_token ?? null;
};

/**
 * Force refresh the session and return it.
 * Use this when you get a JWT expired error.
 */
export const forceRefreshSession = async (): Promise<Session | null> => {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      console.error('Force refresh failed:', error);
      await supabase.auth.signOut();
      return null;
    }
    return data.session;
  } catch (error) {
    console.error('Unexpected error in forceRefreshSession:', error);
    return null;
  }
};

/**
 * Execute a Supabase operation with automatic retry on JWT expired.
 * This will refresh the token and retry once if JWT is expired.
 */
export const withAuthRetry = async <T>(
  operation: () => Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: any }> => {
  const result = await operation();
  
  // Check if error is JWT related
  if (result.error?.code === 'PGRST303' || 
      result.error?.message?.includes('JWT expired') ||
      result.error?.message?.includes('JWT')) {
    console.log('JWT error detected, refreshing and retrying...');
    
    const session = await forceRefreshSession();
    if (!session) {
      return { data: null, error: { message: 'Session expired. Please sign in again.' } };
    }
    
    // Retry the operation
    return await operation();
  }
  
  return result;
};

/**
 * Ensure user is authenticated before performing an action.
 * Returns the session if authenticated, null otherwise.
 * Shows a toast message if not authenticated.
 */
export const ensureAuthenticated = async (showMessage = true): Promise<Session | null> => {
  const session = await getFreshSession();
  
  if (!session && showMessage) {
    // Dynamic import to avoid circular dependencies
    const { toast } = await import('sonner');
    toast.error('Please sign in to continue');
  }
  
  return session;
};

/**
 * Check if a session ID is a demo session (not a real UUID)
 */
export const isDemoSession = (sessionId: string): boolean => {
  return sessionId.startsWith('demo-') || sessionId.startsWith('host-');
};

/**
 * Check if a session ID is the demo live session specifically
 */
export const isDemoLiveSession = (sessionId: string): boolean => {
  return sessionId.startsWith('demo-room-') || sessionId === 'demo-live-session' || sessionId === 'demo-live-session-2' || sessionId === 'demo-live-session-3';
};

/**
 * Check if a user ID is a demo user (not a real UUID)
 */
export const isDemoUser = (userId: string): boolean => {
  return userId.startsWith('host-') || userId.startsWith('demo-');
};

/**
 * Validate if a string is a valid UUID
 */
export const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};
