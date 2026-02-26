import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Lock, CheckCircle } from 'lucide-react';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event from the auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
    });

    // Also check hash for recovery type (fallback)
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setIsRecovery(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(error.message || 'Failed to update password');
      } else {
        setDone(true);
        toast.success('Password updated successfully!');
        setTimeout(() => navigate('/auth'), 2000);
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isRecovery && !done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-background">
        <Card className="w-full max-w-md bg-card/80 backdrop-blur-xl border-border/50">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-foreground">Invalid Link</CardTitle>
            <CardDescription className="text-muted-foreground">
              This password reset link is invalid or has expired. Please request a new one.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/auth')} className="w-full">
              Back to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-background">
        <Card className="w-full max-w-md bg-card/80 backdrop-blur-xl border-border/50">
          <CardHeader className="text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
            <CardTitle className="text-2xl text-foreground">Password Updated</CardTitle>
            <CardDescription className="text-muted-foreground">
              Redirecting you to sign in…
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-background">
      <Card className="w-full max-w-md bg-card/80 backdrop-blur-xl border-border/50">
        <CardHeader className="text-center">
          <Lock className="w-10 h-10 text-primary mx-auto mb-2" />
          <CardTitle className="text-2xl text-foreground">Set New Password</CardTitle>
          <CardDescription className="text-muted-foreground">
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="••••••••"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="bg-background/50"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Updating…' : 'Update Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
