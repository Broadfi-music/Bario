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
        
        if (event === 'SIGNED_IN') {
          console.log('User signed in successfully');
          // After OAuth sign-in, redirect to dashboard if user landed on root
          if (session?.user) {
            const currentPath = window.location.pathname;
            // Only redirect if on root or auth page (OAuth redirect landing pages)
            if (currentPath === '/' || currentPath === '/auth') {
              // Use setTimeout to avoid state update conflicts
              setTimeout(() => {
                window.location.href = '/dashboard';
              }, 100);
            }
          }
        }
        
        if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed successfully');
        }
        
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

    // Removed aggressive 30-second polling interval.
    // autoRefreshToken: true on the Supabase client handles token refresh automatically.

    return () => {
      subscription.unsubscribe();
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
    const redirectUri = window.location.origin;

    const result = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: redirectUri,
      extraParams: {
        prompt: 'select_account',
      },
    });

    return { error: result.error ? (result.error as Error) : null };
  };

  const signInWithApple = async () => {
    const result = await lovable.auth.signInWithOAuth('apple', {
      redirect_uri: window.location.origin,
    });
    return { error: result.error ? (result.error as Error) : null };
  };

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
