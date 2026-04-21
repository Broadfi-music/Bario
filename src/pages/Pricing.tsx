import { Navbar } from '@/components/Navbar';
import { useEffect, useState } from 'react';
import { Check, Zap, Sparkles, Coins } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { useUserCredits } from '@/hooks/useUserCredits';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface CreditPack {
  id: string;
  name: string;
  credits: number;
  bonus_credits: number;
  price_usd: number;
  is_popular: boolean;
}

const Pricing = () => {
  const { user } = useAuth();
  const { credits } = useUserCredits();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [packs, setPacks] = useState<CreditPack[]>([]);

  useEffect(() => {
    supabase
      .from('credit_packs')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => {
        if (data) setPacks(data as CreditPack[]);
      });
  }, []);

  const plans = [
    {
      key: 'free',
      name: 'Free',
      monthlyPrice: 0,
      yearlyPrice: 0,
      tagline: 'Get started — try Bario AI Studio',
      credits: '5 credits / day',
      songs: '~4 songs per day',
      features: [
        '5 free credits daily',
        '2 songs per generation',
        'Basic music quality',
        'Community gallery access',
        'Personal use only',
      ],
    },
    {
      key: 'basic',
      name: 'Basic',
      monthlyPrice: 4,
      yearlyPrice: 40,
      tagline: 'Perfect for casual creators',
      credits: '125 credits / month',
      songs: '~100 songs per month',
      icon: Zap,
      features: [
        '125 monthly credits',
        '~100 song generations',
        'High-quality stereo audio',
        'Faster generation queue',
        'Personal use only',
        'Top-up packs available',
      ],
    },
    {
      key: 'pro',
      name: 'Pro',
      monthlyPrice: 10,
      yearlyPrice: 100,
      tagline: 'For serious music creators',
      credits: '250 credits / month',
      songs: '~200 songs per month',
      popular: true,
      icon: Sparkles,
      features: [
        '250 monthly credits',
        '~200 song generations',
        'Priority generation queue',
        'Highest audio quality',
        'Commercial use rights',
        'Early access to new models',
        'Top-up packs available',
      ],
    },
  ];

  const handleSubscribe = (planKey: string) => {
    if (!user) {
      toast({ title: 'Sign in required', description: 'Please sign in to subscribe.' });
      return;
    }
    toast({
      title: 'Checkout coming soon',
      description: `${planKey === 'free' ? 'You are on Free' : 'Secure payments are being finalized for ' + planKey + '. We\'ll email you when it\'s live.'}`,
    });
  };

  const handleBuyPack = (pack: CreditPack) => {
    if (!user) {
      toast({ title: 'Sign in required', description: 'Please sign in to buy credit packs.' });
      return;
    }
    toast({
      title: 'Checkout coming soon',
      description: `${pack.name} (${pack.credits + pack.bonus_credits} credits) checkout will be available shortly.`,
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <div className="container mx-auto px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-10 max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4">
            Make music your way
          </h1>
          <p className="text-foreground/60 text-lg mb-8">
            Choose a plan, or top up with credit packs anytime. Every generation creates 2 songs and uses ~2.5 credits.
          </p>

          {user && (
            <div className="inline-flex items-center gap-2 bg-foreground/5 border border-foreground/10 rounded-full px-5 py-2 mb-6">
              <Coins className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                Your balance: <span className="text-foreground font-bold">{credits.balance}</span> credits
              </span>
              <span className="text-xs text-foreground/50">• Plan: {credits.plan}</span>
            </div>
          )}

          {/* Billing Toggle */}
          <div className="inline-flex items-center bg-foreground/5 rounded-full p-1">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-foreground text-background'
                  : 'text-foreground/60 hover:text-foreground'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${
                billingCycle === 'yearly'
                  ? 'bg-foreground text-background'
                  : 'text-foreground/60 hover:text-foreground'
              }`}
            >
              Yearly
              <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
                -16%
              </span>
            </button>
          </div>
        </div>

        {/* Subscription Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-20">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isCurrentPlan = credits.plan === plan.key;
            return (
              <div
                key={plan.name}
                className={`relative bg-foreground/[0.03] rounded-2xl p-7 flex flex-col border ${
                  plan.popular ? 'border-foreground/40 ring-1 ring-foreground/20' : 'border-foreground/10'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-foreground text-background px-3 py-1 rounded-full text-xs font-semibold">
                    Most Popular
                  </div>
                )}

                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-2">
                    {Icon && <Icon className="h-5 w-5 text-primary" />}
                    <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                  </div>
                  <p className="text-foreground/60 text-sm mb-5">{plan.tagline}</p>

                  <div className="flex items-baseline mb-1">
                    <span className="text-5xl font-bold text-foreground">
                      ${billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice}
                    </span>
                    <span className="text-foreground/60 ml-2 text-sm">
                      /{billingCycle === 'monthly' ? 'month' : 'year'}
                    </span>
                  </div>
                  {billingCycle === 'yearly' && plan.yearlyPrice > 0 && (
                    <p className="text-xs text-foreground/50">
                      ${(plan.yearlyPrice / 12).toFixed(2)}/month equivalent
                    </p>
                  )}
                </div>

                <div className="bg-foreground/5 rounded-lg px-3 py-2.5 mb-5">
                  <p className="text-foreground font-semibold text-sm">{plan.credits}</p>
                  <p className="text-foreground/50 text-xs">{plan.songs}</p>
                </div>

                <button
                  onClick={() => handleSubscribe(plan.key)}
                  disabled={isCurrentPlan}
                  className={`w-full py-3 rounded-full font-semibold text-sm transition-colors mb-6 ${
                    isCurrentPlan
                      ? 'bg-foreground/10 text-foreground/50 cursor-not-allowed'
                      : plan.popular
                      ? 'bg-foreground text-background hover:bg-foreground/90'
                      : 'bg-foreground/10 text-foreground hover:bg-foreground/20'
                  }`}
                >
                  {isCurrentPlan ? 'Current plan' : plan.monthlyPrice === 0 ? 'Get started' : 'Subscribe'}
                </button>

                <ul className="space-y-2.5 text-sm">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="text-foreground/70 flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Credit Packs */}
        <div className="max-w-5xl mx-auto mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              Need more credits?
            </h2>
            <p className="text-foreground/60">
              Top up anytime. Credits never expire and stack with your plan.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {packs.map((pack) => {
              const total = pack.credits + pack.bonus_credits;
              return (
                <div
                  key={pack.id}
                  className={`relative bg-foreground/[0.03] rounded-xl p-5 border ${
                    pack.is_popular ? 'border-foreground/40' : 'border-foreground/10'
                  }`}
                >
                  {pack.is_popular && (
                    <div className="absolute -top-2 right-3 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                      BEST VALUE
                    </div>
                  )}
                  <h3 className="font-semibold text-foreground mb-1">{pack.name}</h3>
                  <p className="text-2xl font-bold text-foreground">{total}</p>
                  <p className="text-xs text-foreground/50 mb-3">
                    credits {pack.bonus_credits > 0 && (
                      <span className="text-primary">+{pack.bonus_credits} bonus</span>
                    )}
                  </p>
                  <p className="text-foreground/70 text-sm mb-3">
                    ~{Math.floor(total / 2.5)} songs
                  </p>
                  <button
                    onClick={() => handleBuyPack(pack)}
                    className="w-full bg-foreground text-background py-2 rounded-full font-semibold text-sm hover:bg-foreground/90 transition-colors"
                  >
                    ${pack.price_usd}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* How credits work */}
        <div className="max-w-3xl mx-auto bg-foreground/[0.03] border border-foreground/10 rounded-2xl p-7 mb-20">
          <h3 className="text-xl font-bold text-foreground mb-4">How credits work</h3>
          <ul className="space-y-2 text-sm text-foreground/70">
            <li className="flex gap-2">
              <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              Each generation creates <strong className="text-foreground">2 unique songs</strong> and costs <strong className="text-foreground">~2.5 credits</strong>.
            </li>
            <li className="flex gap-2">
              <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              Free users get <strong className="text-foreground">5 credits every day</strong> — about 4 free songs daily.
            </li>
            <li className="flex gap-2">
              <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              When your plan or daily credits run out, buy a credit pack to keep creating.
            </li>
            <li className="flex gap-2">
              <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              Purchased credits <strong className="text-foreground">never expire</strong>.
            </li>
          </ul>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-foreground/10 py-12 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-xl font-bold text-foreground mb-4">Bario</h3>
              <p className="text-foreground/60 text-sm">
                Transform any song into multiple genres instantly with AI-powered remixing.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Brand</h4>
              <ul className="space-y-2 text-sm text-foreground/60">
                <li><Link to="/" className="hover:text-foreground transition-colors">About</Link></li>
                <li><Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-foreground/60">
                <li><Link to="/terms" className="hover:text-foreground transition-colors">Terms of service</Link></li>
                <li><Link to="/privacy" className="hover:text-foreground transition-colors">Privacy policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-foreground/10 mt-8 pt-8 text-center text-sm text-foreground/60">
            © 2025 Bario. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Pricing;
