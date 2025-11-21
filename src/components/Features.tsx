import { Music, Zap, Sparkles, Clock, Radio, Wand2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

const features = [
  {
    icon: Music,
    title: "Era Transformation",
    description: "Travel through time - from 1920s jazz to 2020s hyperpop. Your song, reimagined across decades."
  },
  {
    icon: Radio,
    title: "Genre Fusion",
    description: "Mix genres like never before. Turn your ballad into dubstep, or your rock into lo-fi. The choice is yours."
  },
  {
    icon: Zap,
    title: "Instant Processing",
    description: "Advanced AI processing delivers your remix in seconds, not hours. Lightning-fast transformation."
  },
  {
    icon: Sparkles,
    title: "Studio Quality",
    description: "Professional-grade output with pristine audio quality. Every remix sounds like it was made in a studio."
  },
  {
    icon: Clock,
    title: "Unlimited Variations",
    description: "Create as many versions as you want. Experiment freely and find the perfect remix."
  },
  {
    icon: Wand2,
    title: "AI Magic",
    description: "Powered by cutting-edge AI models trained on millions of songs across all genres and eras."
  }
];

export const Features = () => {
  return (
    <section className="relative py-32 px-6">
      <div className="container mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-5xl md:text-6xl font-bold mb-6 text-foreground">
            How It Works
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Three simple steps to transform your music into something extraordinary
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card 
                key={index}
                className="group relative p-8 bg-card/50 border-border/50 backdrop-blur-sm hover:border-accent/50 transition-all duration-300 hover:shadow-glow overflow-hidden"
              >
                {/* Animated background */}
                <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="relative space-y-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent to-pink-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Icon className="w-7 h-7 text-foreground" />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-foreground group-hover:text-accent transition-colors">
                    {feature.title}
                  </h3>
                  
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};
