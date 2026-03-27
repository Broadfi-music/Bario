import { useIsMobile } from '@/hooks/use-mobile';
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Music, Sliders, ArrowRight, Menu, X, Upload, Link as LinkIcon, FileAudio, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import remixStudio from '@/assets/starters/remix-studio.jpg';
import trendingRemix from '@/assets/starters/trending-remix.jpg';
import genreRemix from '@/assets/starters/genre-remix.jpg';
import audioEffects from '@/assets/starters/audio-effects.jpg';

const AIRemix = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [prompt, setPrompt] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showGenre, setShowGenre] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [uploadedName, setUploadedName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const genres = [
    'pop', 'rap', 'rock', 'r&b', 'classical', 'jazz', 'soul & funk',
    'afro', 'indie & alternative', 'latin music', 'dance & edm',
    'reggaeton', 'electronic', 'country', 'metal', 'k-pop',
    'reggae', 'blues', 'folk', 'lofi', 'acoustic',
    'caribbean', 'japanese music', 'amapiano', 'gospel', 'instrumental',
    'trap', 'funk', 'hiphop'
  ];

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFile(file);
      setUploadedName(file.name);
      setShowUpload(false);
    }
  };

  const handleAddUrl = () => {
    if (audioUrl.trim()) {
      let name = 'Music Link';
      try {
        const url = new URL(audioUrl);
        if (url.hostname.includes('spotify')) name = 'Spotify Track';
        else if (url.hostname.includes('soundcloud')) name = 'SoundCloud Track';
        else if (url.hostname.includes('youtube')) name = 'YouTube Audio';
        else if (url.hostname.includes('apple')) name = 'Apple Music Track';
      } catch {}
      setUploadedName(name);
      setShowUpload(false);
    }
  };

  const handleSubmit = () => {
    if (prompt.trim() || uploadedFile || audioUrl) {
      navigate('/dashboard/new-remix', {
        state: {
          prompt: prompt.trim(),
          genre: selectedGenre,
          uploadedFileName: uploadedName,
          audioUrl: audioUrl || undefined,
        }
      });
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
      <main className={`${isMobile ? 'pt-11 pb-14' : 'ml-[200px] lg:ml-[220px]'}`}>
        {/* Hero */}
        <div className="text-center py-2 px-3">
          <h1 className="text-2xl md:text-4xl font-bold text-white mb-2 leading-tight">
            Remix the <span className="text-white/60">music</span> you imagine.
          </h1>

          {/* Input Area */}
          <div className="max-w-2xl mx-auto">
            <div className="border border-white/10 rounded-xl p-3 md:p-4 bg-white/5">
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

              {/* Uploaded file indicator */}
              {uploadedName && (
                <div className="flex items-center gap-2 mb-2 px-1">
                  <FileAudio className="h-3.5 w-3.5 text-white/60" />
                  <span className="text-[11px] text-white/60 truncate flex-1">{uploadedName}</span>
                  <button onClick={() => { setUploadedFile(null); setUploadedName(''); setAudioUrl(''); }} className="text-white/40 hover:text-white">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              {/* Genre indicator */}
              {selectedGenre && (
                <div className="flex items-center gap-2 mb-2 px-1">
                  <Music className="h-3.5 w-3.5 text-white/60" />
                  <span className="text-[11px] text-white/60">Genre: {selectedGenre.charAt(0).toUpperCase() + selectedGenre.slice(1)}</span>
                  <button onClick={() => setSelectedGenre('')} className="text-white/40 hover:text-white">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                <div className="flex items-center gap-1.5">
                  <button onClick={() => { setShowUpload(!showUpload); setShowGenre(false); }} className={`h-7 px-2.5 rounded-full text-[10px] font-medium flex items-center gap-1.5 transition-colors ${showUpload ? 'bg-white/20 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>
                    <Upload className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Upload</span>
                  </button>
                  <button onClick={() => { setShowGenre(!showGenre); setShowUpload(false); }} className={`h-7 px-2.5 rounded-full text-[10px] font-medium flex items-center gap-1.5 transition-colors ${showGenre ? 'bg-white/20 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>
                    <Sliders className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Genre</span>
                  </button>
                </div>
                <button
                  onClick={handleSubmit}
                  className="w-8 h-8 rounded-full bg-white flex items-center justify-center hover:bg-white/80 transition-colors"
                >
                  <ArrowRight className="h-4 w-4 text-black" />
                </button>
              </div>

              {/* Upload Panel */}
              {showUpload && (
                <div className="mt-2 pt-2 border-t border-white/5 space-y-2">
                  <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} />
                  <button onClick={() => fileInputRef.current?.click()} className="w-full border border-dashed border-white/20 rounded-lg p-3 text-center hover:border-white/40 transition-colors">
                    <Upload className="h-5 w-5 mx-auto mb-1 text-white/40" />
                    <p className="text-[11px] text-white/40">Click to upload audio (MP3, WAV)</p>
                  </button>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="Or paste music link..."
                      value={audioUrl}
                      onChange={(e) => setAudioUrl(e.target.value)}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 outline-none"
                    />
                    <button onClick={handleAddUrl} disabled={!audioUrl} className="px-3 py-2 bg-white/10 rounded-lg text-xs text-white/60 hover:bg-white/20 disabled:opacity-30">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Genre Panel */}
              {showGenre && (
                <div className="mt-2 pt-2 border-t border-white/5">
                  <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto">
                    {genres.map((genre) => (
                      <button
                        key={genre}
                        onClick={() => { setSelectedGenre(genre); setShowGenre(false); }}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors ${
                          selectedGenre === genre ? 'bg-white text-black' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70'
                        }`}
                      >
                        {genre.charAt(0).toUpperCase() + genre.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Starters — centered */}
        <section className="max-w-5xl mx-auto px-4">
          <h2 className="text-sm md:text-base font-bold text-white mb-1.5">Starters</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
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
                className="group relative aspect-[4/3] overflow-hidden text-left rounded-lg"
              >
                <img src={starter.image} alt={starter.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                {starter.badge && (
                  <span className="absolute top-2 left-2 bg-white text-black text-[8px] font-bold px-1.5 py-0.5 rounded">
                    {starter.badge}
                  </span>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-2.5">
                  <h3 className="text-sm font-semibold text-white leading-tight">{starter.title}</h3>
                  {starter.description && (
                    <p className="text-[10px] text-white/60 mt-0.5 line-clamp-2">{starter.description}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* CTA — centered */}
        <section className="max-w-5xl mx-auto px-4 mt-2">
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 md:p-8 text-white text-center">
            <h2 className="text-lg md:text-2xl font-bold mb-1">
              Everything you need to remix, publish, and share.
            </h2>
            <p className="text-white/40 text-xs md:text-sm mb-3 max-w-xl mx-auto">
              Upload any song, choose your genre, and let AI transform it into a professional-quality remix.
            </p>
            <Link to="/auth">
              <button className="bg-white text-black px-4 py-2 rounded-lg font-semibold text-sm hover:bg-white/90 transition-colors">
                Get Started
              </button>
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="max-w-5xl mx-auto border-t border-white/10 py-2 text-center mt-2">
          <p className="text-[9px] text-white/30">© 2025 Bario. All rights reserved.</p>
        </footer>
      </main>
    </div>
  );
};

export default AIRemix;
