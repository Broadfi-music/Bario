import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { getRandomAvatarUrl, getRandomCoverUrl } from '@/lib/randomAvatars';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInWithApple: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Handle token refresh events
        if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed successfully');
        }
        
        // Handle refresh failure - sign out user
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
        }
      }
    );

    // THEN check for existing session
    const initSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.log('Session error, attempting refresh...');
          const { data: refreshData } = await supabase.auth.refreshSession();
          setSession(refreshData.session);
          setUser(refreshData.session?.user ?? null);
        } else {
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (err) {
        console.error('Failed to initialize session:', err);
        setSession(null);
        setUser(null);
      }
      setLoading(false);
    };
    
    initSession();

    // Set up automatic token refresh interval - check every 30 seconds
    const refreshInterval = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // Check if token expires soon (within 2 minutes)
          const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
          const now = Date.now();
          const twoMinutes = 2 * 60 * 1000;
          
          if (expiresAt - now < twoMinutes) {
            console.log('Token expiring soon, refreshing...');
            await supabase.auth.refreshSession();
          }
        }
      } catch (err) {
        console.error('Token refresh interval error:', err);
      }
    }, 30000); // Check every 30 seconds

    return () => {
      subscription.unsubscribe();
      clearInterval(refreshInterval);
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        }
      }
    });
    
    // Auto-create profile if user was created successfully
    if (data?.user && !error) {
      // Use setTimeout to defer the profile creation (avoid auth deadlock)
      setTimeout(async () => {
        const randomAvatar = getRandomAvatarUrl(data.user!.id);
        const randomCover = getRandomCoverUrl(data.user!.id);
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            user_id: data.user!.id,
            full_name: fullName,
            username: email.split('@')[0],
            avatar_url: randomAvatar,
            cover_image_url: randomCover,
          }, { onConflict: 'user_id' });
        
        if (profileError) {
          console.error('Error creating profile:', profileError);
        }
      }, 0);
    }
    
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signInWithGoogle = async () => {
    const isCustomDomain = !window.location.hostname.includes('lovable.app') && 
                           !window.location.hostname.includes('lovableproject.com');
    
    if (isCustomDomain) {
      // Bypass auth-bridge for custom domains
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
          skipBrowserRedirect: true,
        },
      });
      if (error) return { error: error as Error };
      if (data?.url) {
        window.location.href = data.url;
      }
      return { error: null };
    } else {
      const result = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
      });
      return { error: result.error ? (result.error as Error) : null };
    }
  };

  const signInWithApple = async () => {
    const result = await lovable.auth.signInWithOAuth('apple', {
      redirect_uri: window.location.origin,
    });
    return { error: result.error ? (result.error as Error) : null };
  };

  // Push subscription is now handled by PushSubscriptionManager component

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signInWithGoogle, signInWithApple, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
