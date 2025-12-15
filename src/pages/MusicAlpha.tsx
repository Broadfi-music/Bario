import { Link } from 'react-router-dom';
import { ArrowLeft, Rocket, Zap, TrendingUp, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Navbar } from '@/components/Navbar';

const MusicAlpha = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <Link to="/" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
          
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
              Music Alpha
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Early access to cutting-edge music intelligence tools. Get ahead of the curve with experimental features and beta releases.
            </p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="p-6 bg-card border-border">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <Rocket className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Early Access</h3>
                  <p className="text-sm text-muted-foreground">
                    Be the first to try new features before they're released to the public.
                  </p>
                </div>
              </div>
            </Card>
            
            <Card className="p-6 bg-card border-border">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <Zap className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">AI Experiments</h3>
                  <p className="text-sm text-muted-foreground">
                    Test experimental AI models and algorithms for music analysis.
                  </p>
                </div>
              </div>
            </Card>
            
            <Card className="p-6 bg-card border-border">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-yellow-500/10 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Predictive Analytics</h3>
                  <p className="text-sm text-muted-foreground">
                    Get early signals on which songs might break out next.
                  </p>
                </div>
              </div>
            </Card>
            
            <Card className="p-6 bg-card border-border">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-500/10 rounded-lg">
                  <Music className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Sound Labs</h3>
                  <p className="text-sm text-muted-foreground">
                    Experiment with next-gen audio processing and remix tools.
                  </p>
                </div>
              </div>
            </Card>
          </div>
          
          <div className="mt-12 text-center">
            <Card className="p-8 bg-gradient-to-br from-card to-accent/20 border-border">
              <h2 className="text-2xl font-bold text-foreground mb-4">Coming Soon</h2>
              <p className="text-muted-foreground mb-6">
                Music Alpha is currently in development. Sign up to be notified when it launches.
              </p>
              <Link to="/auth">
                <Button className="bg-foreground text-background hover:bg-foreground/90">
                  Join Waitlist
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MusicAlpha;
