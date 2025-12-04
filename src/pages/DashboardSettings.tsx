import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

const DashboardSettings = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const currentPlan = 'Creator Pro';
  
  const plans = [
    {
      name: 'Creator Free',
      price: '$0',
      period: '/month',
      features: [
        '4 SongTime transformations',
        '3 MusicWarp filters',
        'Lite BeatPulse matching',
        'Basic MEGASHUFFLE discovery',
        'Limited ViralPath missions',
        'Low-priority exports'
      ],
      current: false
    },
    {
      name: 'Creator Basic',
      price: '$5',
      period: '/month',
      features: [
        '15 SongTime transformations',
        '10 MusicWarp filters',
        'Basic BeatPulse matching',
        'Full ViralPath missions',
        'Global discovery challenges',
        'Standard exports',
        'Community badge'
      ],
      current: false
    },
    {
      name: 'Creator Pro',
      price: '$12',
      period: '/month',
      popular: true,
      features: [
        '100 SongTime transformations',
        '100 MusicWarp filters',
        'Full BeatPulse access',
        'Detailed SceneVibe analytics',
        'Higher ViralPath ranking',
        'Priority HQ WAV exports',
        'Spotlight boosts',
        'Smart recommendations'
      ],
      current: true
    },
    {
      name: 'Label Basic',
      price: '$29',
      period: '/month',
      features: [
        'All Creator Pro features',
        '5-artist management',
        'Growth dashboard',
        'Weekly insights',
        'Release timing suggestions',
        'Basic heat-map data',
        'Early feature access'
      ],
      current: false
    },
    {
      name: 'Label Pro',
      price: '$49',
      period: '/month',
      features: [
        'All Label Basic features',
        '20-artist management',
        'Advanced heat-map intelligence',
        'AI-powered release strategy',
        'Smart distribution tools',
        'TikTok/YouTube challenge planner',
        'Global discovery priority',
        'VIP early access',
        'Dedicated support'
      ],
      current: false
    }
  ];

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
            <p className="text-muted-foreground mt-1">Current plan: <span className="font-semibold">{currentPlan}</span></p>
          </div>
        </div>

        {/* Current Plan Info */}
        <Card className="p-6 mb-8 border-primary">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground mb-1">{currentPlan}</h2>
              <p className="text-muted-foreground">Your subscription renews on January 15, 2025</p>
            </div>
            <Button variant="outline">Cancel Subscription</Button>
          </div>
        </Card>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card key={plan.name} className={`p-6 ${plan.current ? 'border-primary' : ''}`}>
              <div className="space-y-4">
                <div>
                  {plan.popular && (
                    <Badge className="mb-2">Most Popular</Badge>
                  )}
                  {plan.current && (
                    <Badge variant="secondary" className="mb-2">Current Plan</Badge>
                  )}
                  <h3 className="text-2xl font-bold text-foreground">{plan.name}</h3>
                  <div className="flex items-baseline mt-2">
                    <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-muted-foreground ml-1">{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                {plan.current ? (
                  <Button disabled className="w-full">Current Plan</Button>
                ) : (
                  <Button 
                    className={`w-full ${plan.popular ? 'bg-black text-white hover:bg-black/90' : ''}`}
                    variant={plan.popular ? 'default' : 'outline'}
                  >
                    {plan.price === '$0' ? 'Downgrade' : 'Upgrade'}
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardSettings;
