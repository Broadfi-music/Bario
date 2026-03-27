import { useIsMobile } from '@/hooks/use-mobile';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Music, Mic, Radio, Sliders, ArrowRight } from 'lucide-react';
import remixStudio from '@/assets/starters/remix-studio.jpg';
import trendingRemix from '@/assets/starters/trending-remix.jpg';
import genreRemix from '@/assets/starters/genre-remix.jpg';
import audioEffects from '@/assets/starters/audio-effects.jpg';

const AIRemix = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [prompt, setPrompt] = useState('');

  const rotatingTexts = [
    'remix any song to amapiano',
    'remix any song to country music',
    'remix any song you can imagine',
    'remix any song to trap beats',
    'remix any song to lo-fi chill',
  ];

  const [textIndex, setTextIndex] = useState(0);

  useState(() => {
    const interval = setInterval(() => {
      setTextIndex(prev => (prev + 1) % rotatingTexts.length);
    }, 3000);
    return () => clearInterval(interval);
  });

  const starters = [
    {
      image: remixStudio,
      title: 'Build your remix',
      description: 'Your next hit starts here. Upload a song and transform it into any genre.',
      badge: 'NEW',
    },
    {
      image: trendingRemix,
      title: 'What remixes are trending?',
      steps: ['1. List the top 3 trending Bario remixes', '2. Play these remixes in a session'],
    },
    {
      image: genreRemix,
      title: 'Remix a pop song with me',
      steps: ['1. Give me three genre directions for a pop remix', '2. Give me three musical fusion flavors', '3. Help me decide on key and BPM'],
    },
    {
      image: audioEffects,
      title: 'What audio effects can I use on Bario?',
      steps: ['1. Generate an amapiano instrumental', '2. List all audio effects available', '3. Recommend some effects to experiment with'],
    },
  ];

  const handleSubmit = () => {
    if (prompt.trim()) {
      navigate(`/dashboard/new-remix?prompt=${encodeURIComponent(prompt.trim())}`);
    }
  };

  return (
    <div className={`min-h-screen bg-white text-black ${isMobile ? 'pb-20' : ''}`}>
      {/* Mobile Top Nav */}
      {isMobile && (
        <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-black/5">
          <div className="flex items-center justify-between h-11 px-3">
            <img src="/bario-logo.png" alt="Bario" className="h-6 w-auto" />
            <nav className="flex items-center gap-4">
              <button onClick={() => navigate('/ai-remix')} className="text-xs font-semibold text-black border-b-2 border-black pb-0.5">Projects</button>
              <button onClick={() => navigate('/bario-music')} className="text-xs font-semibold text-black/40">Songs</button>
              <button onClick={() => navigate('/podcasts')} className="text-xs font-semibold text-black/40">Spaces</button>
            </nav>
            <button onClick={() => navigate('/auth')} className="text-xs font-semibold text-black/60">Login</button>
          </div>
        </header>
      )}

      {/* Desktop Nav */}
      {!isMobile && (
        <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-black/5">
          <div className="flex items-center h-12 px-4">
            <Link to="/" className="flex items-center gap-1.5">
              <img src="/bario-logo.png" alt="Bario" className="h-6 w-auto" />
              <span className="font-bold text-lg tracking-tight">BARIO</span>
            </Link>

            <div className="flex items-center gap-1 ml-4">
              <Search className="h-3.5 w-3.5 text-black/40" />
            </div>

            <nav className="hidden md:flex items-center gap-5 ml-auto">
              <button onClick={() => navigate('/bario-music')} className="text-xs font-medium text-black/50 hover:text-black">Songs</button>
              <button onClick={() => navigate('/podcasts')} className="text-xs font-medium text-black/50 hover:text-black">Spaces</button>
              <button onClick={() => navigate('/ai-remix')} className="text-xs font-medium text-black">Projects</button>
            </nav>

            <div className="flex items-center gap-2 ml-4">
              <Link to="/auth">
                <button className="bg-black text-white text-xs font-semibold px-3 py-1.5 rounded hover:bg-black/80">LOGIN</button>
              </Link>
            </div>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className={`${isMobile ? 'pt-14' : 'pt-16'} px-4 max-w-4xl mx-auto`}>
        {/* Hero */}
        <div className="text-center py-8 md:py-16">
          <div className="inline-flex items-center gap-1.5 bg-black/5 rounded-full px-3 py-1 text-[10px] font-semibold text-black/60 mb-4 uppercase tracking-wider">
            <Sliders className="h-3 w-3" />
            READY TO REMIX
          </div>

          <h1 className="text-3xl md:text-6xl font-bold text-black mb-8 leading-tight">
            Remix the <span className="text-[#4ade80]">music</span> you imagine.
          </h1>

          {/* Input Area */}
          <div className="max-w-2xl mx-auto">
            <div className="border border-black/10 rounded-xl p-3 md:p-4 bg-white shadow-sm">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={rotatingTexts[textIndex]}
                className="w-full resize-none border-none outline-none text-sm md:text-base text-black placeholder:text-black/30 bg-transparent min-h-[60px]"
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-black/5">
                <div className="flex items-center gap-2">
                  <button className="w-7 h-7 rounded-full bg-black/5 flex items-center justify-center hover:bg-black/10">
                    <Music className="h-3.5 w-3.5 text-black/40" />
                  </button>
                  <button className="w-7 h-7 rounded-full bg-black/5 flex items-center justify-center hover:bg-black/10">
                    <Sliders className="h-3.5 w-3.5 text-black/40" />
                  </button>
                </div>
                <button
                  onClick={handleSubmit}
                  className="w-8 h-8 rounded-full bg-[#4ade80] flex items-center justify-center hover:bg-[#4ade80]/80 transition-colors"
                >
                  <ArrowRight className="h-4 w-4 text-black" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Starters */}
        <section className="mb-12">
          <h2 className="text-lg md:text-xl font-bold text-black mb-4">Starters</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {starters.map((starter, i) => (
              <button
                key={i}
                onClick={() => {
                  if (starter.steps) {
                    setPrompt(starter.steps[0].replace(/^\d\.\s/, ''));
                  } else {
                    navigate('/dashboard/new-remix');
                  }
                }}
                className="group relative aspect-[4/5] rounded-xl overflow-hidden text-left"
              >
                <img src={starter.image} alt={starter.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" width={512} height={512} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                {starter.badge && (
                  <span className="absolute top-2 left-2 bg-[#4ade80] text-black text-[8px] font-bold px-1.5 py-0.5 rounded">
                    {starter.badge}
                  </span>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <h3 className="text-sm font-semibold text-white leading-tight">{starter.title}</h3>
                  {starter.description && (
                    <p className="text-[10px] text-white/60 mt-1 line-clamp-2">{starter.description}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* What will you remix */}
        <section className="mb-12">
          <div className="inline-flex items-center gap-1.5 bg-black/5 rounded-full px-3 py-1 text-[10px] font-semibold text-black/60 mb-4 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 bg-[#4ade80] rounded-full" />
            WHAT WILL YOU REMIX?
          </div>

          <div className="bg-black rounded-2xl p-6 md:p-10 text-white">
            <h2 className="text-2xl md:text-4xl font-bold mb-4">
              Everything you need to remix, publish, and share. All in one place.
            </h2>
            <p className="text-white/60 text-sm md:text-base mb-6 max-w-xl">
              Upload any song, choose your genre, and let AI transform it into a professional-quality remix in seconds.
            </p>
            <Link to="/auth">
              <button className="bg-white text-black px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-white/90 transition-colors">
                Get Started
              </button>
            </Link>
          </div>
        </section>

        {/* Features grid */}
        <section className="mb-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-black/[0.02] rounded-xl p-5">
              <div className="w-10 h-10 rounded-lg bg-[#4ade80]/10 flex items-center justify-center mb-3">
                <Music className="h-5 w-5 text-[#4ade80]" />
              </div>
              <h3 className="font-semibold text-sm mb-1">Remix</h3>
              <p className="text-xs text-black/50">Chat with Bario just like you're in a studio. Remix full-length songs with rich musicality and dynamic vocals.</p>
            </div>
            <div className="bg-black/[0.02] rounded-xl p-5">
              <div className="w-10 h-10 rounded-lg bg-[#4ade80]/10 flex items-center justify-center mb-3">
                <Mic className="h-5 w-5 text-[#4ade80]" />
              </div>
              <h3 className="font-semibold text-sm mb-1">Spaces</h3>
              <p className="text-xs text-black/50">Go live, host rooms, battle other creators. Build your audience with real-time audio interaction.</p>
            </div>
            <div className="bg-black/[0.02] rounded-xl p-5">
              <div className="w-10 h-10 rounded-lg bg-[#4ade80]/10 flex items-center justify-center mb-3">
                <Radio className="h-5 w-5 text-[#4ade80]" />
              </div>
              <h3 className="font-semibold text-sm mb-1">Publish</h3>
              <p className="text-xs text-black/50">Share your remixes with the world. Build your catalog and grow your following on Bario.</p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-black/5 py-6 text-center">
          <p className="text-xs text-black/30">© 2025 Bario. All rights reserved.</p>
        </footer>
      </main>
    </div>
  );
};

export default AIRemix;
