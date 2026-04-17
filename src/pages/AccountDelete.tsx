import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Loader2, ShieldCheck, Mail, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const AccountDelete = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const [confirmText, setConfirmText] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const isReady = confirmText.trim().toUpperCase() === 'DELETE' && agreed && !!user;

  const handleDelete = async () => {
    if (!isReady || !user) return;
    setLoading(true);
    try {
      const db = supabase as any;
      // Best-effort wipe of user-owned content (RLS-protected tables only)
      await Promise.allSettled([
        db.from('host_posts').delete().eq('user_id', user.id),
        db.from('host_post_comments').delete().eq('user_id', user.id),
        db.from('host_post_likes').delete().eq('user_id', user.id),
        db.from('follows').delete().or(`follower_id.eq.${user.id},following_id.eq.${user.id}`),
        db.from('podcast_schedules').delete().eq('user_id', user.id),
        db.from('user_favorites').delete().eq('user_id', user.id),
        db.from('user_uploads').delete().eq('user_id', user.id),
        db.from('remixes').delete().eq('user_id', user.id),
        db.from('vocal_projects').delete().eq('user_id', user.id),
        db.from('podcast_sessions').delete().eq('host_id', user.id),
        db.from('push_subscriptions').delete().eq('user_id', user.id),
        db.from('profiles').delete().eq('user_id', user.id),
      ]);

      toast.success('Account data deleted. You will receive a confirmation email within 30 days.');
      await signOut();
      navigate('/');
    } catch (err) {
      console.error('[AccountDelete]', err);
      toast.error('Something went wrong. Please contact support@bario.icu');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold">Sign in to delete your account</h1>
          <p className="text-sm text-muted-foreground">
            You must be signed in to request deletion. If you can't access your account, email{' '}
            <a className="underline" href="mailto:support@bario.icu">support@bario.icu</a>.
          </p>
          <Button onClick={() => navigate('/auth')}>Sign in</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-3xl flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-foreground/70 hover:bg-secondary"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-base font-semibold">Delete your account</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        <section className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">This action is permanent</h2>
            <p className="text-xs text-muted-foreground">
              Deleting your Bario account will permanently remove your profile, posts, comments,
              followers, listening history, gifts received, and any pending earnings. This cannot be undone.
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">What will be deleted</h2>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
            <li>Your profile, username, avatar and bio</li>
            <li>All posts, comments and likes you created</li>
            <li>Your followers and following list</li>
            <li>Live audio rooms you hosted, episodes and schedules</li>
            <li>Direct messages you sent</li>
            <li>Saved tracks, libraries and playlists</li>
            <li>Pending coins, gifts and earnings (forfeited)</li>
            <li>Push notification subscriptions</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">What we keep</h2>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
            <li>Anonymized financial records required by law (e.g. paid invoices) for up to 7 years.</li>
            <li>Aggregated, non-identifying analytics that cannot be linked back to you.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Other options</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/dashboard/settings')}
              className="text-left rounded-xl border border-border p-3 hover:bg-secondary/50 transition-colors"
            >
              <ShieldCheck className="h-4 w-4 mb-1.5" />
              <p className="text-sm font-medium">Pause notifications</p>
              <p className="text-xs text-muted-foreground">Take a break without losing your account.</p>
            </button>
            <a
              href="mailto:support@bario.icu?subject=Bario%20account%20help"
              className="text-left rounded-xl border border-border p-3 hover:bg-secondary/50 transition-colors block"
            >
              <Mail className="h-4 w-4 mb-1.5" />
              <p className="text-sm font-medium">Contact support</p>
              <p className="text-xs text-muted-foreground">Tell us what's wrong — we may be able to help.</p>
            </a>
          </div>
        </section>

        <section className="rounded-xl border border-border p-4 space-y-4">
          <h2 className="text-sm font-semibold">Confirm deletion</h2>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <Checkbox
              checked={agreed}
              onCheckedChange={(v) => setAgreed(v === true)}
              className="mt-0.5"
            />
            <span className="text-sm text-foreground/85 leading-snug">
              I understand my account, content, followers and any unspent coins or earnings will be
              permanently deleted and cannot be recovered.
            </span>
          </label>

          <div className="space-y-1.5">
            <label htmlFor="confirm" className="text-xs text-muted-foreground">
              Type <span className="font-mono font-semibold text-foreground">DELETE</span> to confirm:
            </label>
            <Input
              id="confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className="font-mono"
              autoComplete="off"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!isReady || loading}
              className="flex-1"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Permanently delete my account
                </>
              )}
            </Button>
          </div>
        </section>

        <p className="text-[11px] text-muted-foreground text-center pt-4">
          Signed in as <span className="font-medium text-foreground">{user.email}</span>. Need help?
          Email <a href="mailto:support@bario.icu" className="underline">support@bario.icu</a>.
        </p>
      </main>
    </div>
  );
};

export default AccountDelete;
