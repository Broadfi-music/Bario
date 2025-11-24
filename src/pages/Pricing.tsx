import { Navbar } from '@/components/Navbar';
import { useState } from 'react';

const Pricing = () => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const plans = [
    {
      name: 'Creator Free',
      monthlyPrice: 0,
      yearlyPrice: 0,
      description: '',
      tagline: 'Perfect for exploring before you upgrade.',
      features: [
        '4 SongTime Machine transformations/month',
        '3 MusicWarp regional filters',
        'Lite BeatPulse matching',
        'Basic MEGASHUFFLE discovery',
        'Limited ViralPath daily missions',
        'Low-priority exports'
      ]
    },
    {
      name: 'Creator Basic',
      monthlyPrice: 5,
      yearlyPrice: 50,
      description: 'For artists and everyday creators.',
      tagline: 'A powerful entry point for fast growth.',
      features: [
        '15 SongTime Machine transformations',
        '10 MusicWarp filters',
        'Basic BeatPulse waveform matching',
        'Full ViralPath missions',
        'Access to global discovery challenges',
        'Standard export quality',
        'Community badge for visibility'
      ]
    },
    {
      name: 'Creator Pro',
      monthlyPrice: 12,
      yearlyPrice: 120,
      description: 'For serious artists ready to accelerate.',
      tagline: 'Turn your creativity into global momentum.',
      popular: true,
      features: [
        '100 SongTime Machine time jumps',
        '100 MusicWarp regional filters',
        'Full BeatPulse access (deep energy analysis)',
        'Detailed SceneVibe performance analytics',
        'Higher ViralPath ranking priority',
        'Priority HQ WAV exports',
        'Creator spotlight boosts in MEGASHUFFLE',
        'Smart creative recommendations'
      ]
    },
    {
      name: 'Label Basic',
      monthlyPrice: 29,
      yearlyPrice: 290,
      description: 'For small teams, managers, and multi-artist accounts.',
      tagline: 'Perfect for managers building new stars.',
      features: [
        'Everything in Creator Pro',
        'Manage up to 5 artists',
        'Artist growth dashboard',
        'Weekly audience insights',
        'Release timing suggestions',
        'Basic heat-map data for regions',
        'Early access to new filters/features'
      ]
    },
    {
      name: 'Label Pro',
      monthlyPrice: 49,
      yearlyPrice: 490,
      description: 'For professional labels, influencers, and music businesses.',
      tagline: 'Your full-scale, AI-powered music operations suite.',
      features: [
        'All tools in Label Basic',
        'Up to 20 artist profiles',
        'Advanced audience heat-map intelligence',
        'AI-powered release strategy generator',
        'Smart distribution support tools',
        'Data-driven TikTok/YouTube challenge planner',
        'Priority in global discovery engines',
        'VIP early feature access',
        'Dedicated support'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      
      <div className="container mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-8">
            Choose your plan
          </h1>
          
          {/* Billing Toggle */}
          <div className="inline-flex items-center bg-foreground/5 rounded-full p-1 mb-16">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-8 py-3 rounded-full text-sm font-semibold transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-foreground text-background'
                  : 'text-foreground/60 hover:text-foreground'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-8 py-3 rounded-full text-sm font-semibold transition-all ${
                billingCycle === 'yearly'
                  ? 'bg-foreground text-background'
                  : 'text-foreground/60 hover:text-foreground'
              }`}
            >
              Yearly
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 max-w-[1600px] mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`bg-foreground/5 rounded-2xl p-6 flex flex-col ${
                plan.popular ? 'border-2 border-foreground relative' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-foreground text-background px-4 py-1 rounded-full text-xs font-semibold">
                  Most Popular
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-bold text-foreground mb-2">{plan.name}</h3>
                {plan.description && (
                  <p className="text-foreground/60 text-xs mb-4">{plan.description}</p>
                )}
                <div className="flex items-baseline mb-2">
                  <span className="text-4xl font-bold text-foreground">
                    ${billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice}
                  </span>
                  <span className="text-foreground/60 ml-2">
                    /{billingCycle === 'monthly' ? 'month' : 'year'}
                  </span>
                </div>
                {billingCycle === 'yearly' && plan.yearlyPrice > 0 && (
                  <p className="text-xs text-foreground/50">
                    ${(plan.yearlyPrice / 12).toFixed(2)}/month
                  </p>
                )}
              </div>

              <button className="w-full bg-foreground text-background py-3 rounded-full font-semibold mb-6 hover:bg-foreground/90 transition-colors text-sm">
                {plan.monthlyPrice === 0 ? 'Get Started' : 'Subscribe'}
              </button>

              <ul className="space-y-2 flex-1 text-xs">
                {plan.features.map((feature, index) => (
                  <li key={index} className="text-foreground/70 flex items-start">
                    <span className="mr-2">•</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <p className="text-foreground/50 text-xs mt-4 italic">
                {plan.tagline}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-foreground/10 py-12 px-6 mt-20">
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
                <li><a href="#" className="hover:text-foreground transition-colors">About</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Hub</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-foreground/60">
                <li><a href="#" className="hover:text-foreground transition-colors">Help</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contact us</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Community guidelines</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">FAQ</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Terms of service</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Privacy policy</a></li>
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
