import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Coins, Zap, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useUserCredits } from '@/hooks/useUserCredits';
import { useEffect } from 'react';
import { toast } from '@/hooks/use-toast';

const DashboardSettings = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { credits } = useUserCredits();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const planLabel: Record<string, string> = {
    free: 'Free',
    basic: 'Basic',
    pro: 'Pro',
  };

  const plans = [
    {
      key: 'free',
      name: 'Free',
      price: '$0',
      period: '/month',
      credits: '5 credits / day',
      features: [
        '5 free credits daily (~4 songs)',
        '2 songs per generation',
        'Basic audio quality',
        'Personal use only',
      ],
    },
    {
      key: 'basic',
      name: 'Basic',
      price: '$4',
      period: '/month',
      credits: '125 credits / month',
      icon: Zap,
      features: [
        '125 monthly credits',
        '~100 song generations',
        'High-quality stereo audio',
        'Faster generation queue',
        'Top-up packs available',
      ],
    },
    {
      key: 'pro',
      name: 'Pro',
      price: '$10',
      period: '/month',
      credits: '250 credits / month',
      popular: true,
      icon: Sparkles,
      features: [
        '250 monthly credits',
        '~200 song generations',
        'Priority generation queue',
        'Commercial use rights',
        'Early access to new models',
      ],
    },
  ];

  const handleSelect = (planKey: string) => {
    if (planKey === credits.plan) return;
    toast({
      title: 'Checkout coming soon',
      description: `Secure payments are being finalized for ${planKey}. We'll email you when it's live.`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Manage Subscription</h1>
            <p className="text-muted-foreground mt-1">
              Current plan: <span className="font-semibold capitalize">{planLabel[credits.plan] || credits.plan}</span>
            </p>
          </div>
        </div>

        {/* Credit Balance Card */}
        <Card className="p-6 mb-8 border-primary/40 bg-primary/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="bg-primary/15 p-3 rounded-xl">
                <Coins className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Available credits</p>
                <p className="text-3xl font-bold text-foreground">{credits.balance}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  ~{Math.floor(credits.balance / 2.5)} song generations remaining •
                  {' '}{credits.total_spent} credits spent total
                </p>
              </div>
            </div>
            <Link to="/pricing">
              <Button>Buy more credits</Button>
            </Link>
          </div>
        </Card>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isCurrent = credits.plan === plan.key;
            return (
              <Card
                key={plan.name}
                className={`p-6 relative ${isCurrent ? 'border-primary' : ''}`}
              >
                <div className="space-y-4">
                  <div>
                    <div className="flex gap-2 mb-2">
                      {plan.popular && <Badge>Most Popular</Badge>}
                      {isCurrent && <Badge variant="secondary">Current Plan</Badge>}
                    </div>
                    <div className="flex items-center gap-2">
                      {Icon && <Icon className="h-5 w-5 text-primary" />}
                      <h3 className="text-2xl font-bold text-foreground">{plan.name}</h3>
                    </div>
                    <div className="flex items-baseline mt-2">
                      <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                      <span className="text-muted-foreground ml-1">{plan.period}</span>
                    </div>
                    <p className="text-sm text-primary font-medium mt-2">{plan.credits}</p>
                  </div>

                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {isCurrent ? (
                    <Button disabled className="w-full">Current Plan</Button>
                  ) : (
                    <Button
                      className="w-full"
                      variant={plan.popular ? 'default' : 'outline'}
                      onClick={() => handleSelect(plan.key)}
                    >
                      {plan.price === '$0' ? 'Downgrade' : 'Upgrade'}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Danger zone */}
        <Card className="p-6 mt-8 border-destructive/40 bg-destructive/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">Delete account</h2>
              <p className="text-sm text-muted-foreground">
                Permanently delete your Bario account, posts, followers and earnings. This cannot be undone.
              </p>
            </div>
            <Link to="/account/delete">
              <Button variant="destructive">Delete account</Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DashboardSettings;
