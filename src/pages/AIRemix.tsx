import { useIsMobile } from '@/hooks/use-mobile';
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Music, Sliders, ArrowRight, Menu, X } from 'lucide-react';
import remixStudio from '@/assets/starters/remix-studio.jpg';
import trendingRemix from '@/assets/starters/trending-remix.jpg';
import genreRemix from '@/assets/starters/genre-remix.jpg';
import audioEffects from '@/assets/starters/audio-effects.jpg';

const AIRemix = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [prompt, setPrompt] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const rotatingTexts = [
    'remix any song to amapiano',
    'remix any song to country music',
    'remix any song you can imagine',
    'remix any song to trap beats',
    'remix any song to lo-fi chill',
  ];

  const [textIndex, setTextIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTextIndex(prev => (prev + 1) % rotatingTexts.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

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

  const navItems = [
    { label: 'Projects', path: '/ai-remix', active: true },
    { label: 'Songs', path: '/bario-music', active: false },
    { label: 'Spaces', path: '/podcasts', active: false },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Desktop/Tablet Sidebar */}
      {!isMobile && (
        <aside className="fixed left-0 top-0 bottom-0 w-[200px] lg:w-[220px] bg-black border-r border-white/10 z-50 flex flex-col">
          <div className="p-4">
            <Link to="/" className="flex items-center gap-1.5">
              <img src="/bario-logo.png" alt="Bario" className="h-6 w-auto" />
              <span className="font-bold text-lg tracking-tight text-white">BARIO</span>
            </Link>
          </div>
          <nav className="flex-1 px-3 mt-4">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium mb-1 transition-colors ${
                  item.active
                    ? 'bg-white/10 text-white'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <div className="p-4 border-t border-white/10">
            <Link to="/auth">
              <button className="w-full bg-white text-black text-xs font-semibold px-3 py-2 rounded-lg hover:bg-white/90">
                LOGIN
              </button>
            </Link>
          </div>
        </aside>
      )}

      {/* Mobile Top Nav */}
      {isMobile && (
        <header className="fixed top-0 left-0 right-0 z-50 bg-black border-b border-white/10">
          <div className="flex items-center justify-between h-11 px-3">
            <Link to="/" className="flex items-center gap-1.5">
              <img src="/bario-logo.png" alt="Bario" className="h-5 w-auto" />
              <span className="font-bold text-sm tracking-tight text-white">BARIO</span>
            </Link>
            <nav className="flex items-center gap-4">
              {navItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => navigate(item.path)}
                  className={`text-xs font-semibold ${
                    item.active
                      ? 'text-white border-b-2 border-white pb-0.5'
                      : 'text-white/40'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
            <Link to="/auth" className="text-xs font-semibold text-white/60">Login</Link>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className={`${isMobile ? 'pt-12 pb-16' : 'ml-[200px] lg:ml-[220px] pt-4'} px-3 md:px-4 max-w-4xl mx-auto`}>
        {/* Hero */}
        <div className="text-center py-2 md:py-4">
          <div className="inline-flex items-center gap-1.5 bg-white/5 rounded-full px-3 py-1 text-[10px] font-semibold text-white/60 mb-2 uppercase tracking-wider">
            <Sliders className="h-3 w-3" />
            READY TO REMIX
          </div>

          <h1 className="text-2xl md:text-4xl font-bold text-white mb-2 leading-tight">
            Remix the <span className="text-white/60">music</span> you imagine.
          </h1>

          {/* Input Area */}
          <div className="max-w-2xl mx-auto">
            <div className="border border-white/10 rounded-xl p-2.5 md:p-3 bg-white/5">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={rotatingTexts[textIndex]}
                className="w-full resize-none border-none outline-none text-sm text-white placeholder:text-white/30 bg-transparent min-h-[48px]"
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <button className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10">
                    <Music className="h-3.5 w-3.5 text-white/40" />
                  </button>
                  <button className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10">
                    <Sliders className="h-3.5 w-3.5 text-white/40" />
                  </button>
                </div>
                <button
                  onClick={handleSubmit}
                  className="w-8 h-8 rounded-full bg-white flex items-center justify-center hover:bg-white/80 transition-colors"
                >
                  <ArrowRight className="h-4 w-4 text-black" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Starters */}
        <section className="mb-3">
          <h2 className="text-sm md:text-base font-bold text-white mb-2">Starters</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
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
                className="group relative aspect-[5/4] rounded-lg overflow-hidden text-left"
              >
                <img src={starter.image} alt={starter.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" width={512} height={512} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                {starter.badge && (
                  <span className="absolute top-2 left-2 bg-white text-black text-[8px] font-bold px-1.5 py-0.5 rounded">
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
        <section className="mb-6">
          <div className="inline-flex items-center gap-1.5 bg-white/5 rounded-full px-3 py-1 text-[10px] font-semibold text-white/60 mb-4 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 bg-white rounded-full" />
            WHAT WILL YOU REMIX?
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-10 text-white">
            <h2 className="text-2xl md:text-4xl font-bold mb-4">
              Everything you need to remix, publish, and share. All in one place.
            </h2>
            <p className="text-white/40 text-sm md:text-base mb-6 max-w-xl">
              Upload any song, choose your genre, and let AI transform it into a professional-quality remix in seconds.
            </p>
            <Link to="/auth">
              <button className="bg-white text-black px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-white/90 transition-colors">
                Get Started
              </button>
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10 py-6 text-center">
          <p className="text-xs text-white/30">© 2025 Bario. All rights reserved.</p>
        </footer>
      </main>
    </div>
  );
};

export default AIRemix;
