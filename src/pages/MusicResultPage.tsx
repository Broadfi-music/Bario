import { useLocation, useNavigate } from 'react-router-dom';
import { MusicResult } from '@/components/MusicResult';
import TextToMusicResult, { TextToMusicVariation } from '@/components/TextToMusicResult';
import type { FxConfig } from '@/hooks/useAudioRemix';

const MusicResultPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as {
    mode?: 'remix' | 'vocal-project' | 'text-to-music';
    trackTitle?: string;
    genre?: string;
    era?: string;
    prompt?: string;
    albumArt?: string;
    trackId?: string;
    fxConfig?: FxConfig;
    audioUrl?: string;
    songOptions?: string[];
    originalVocalUrl?: string;
    selectedVariation?: number;
    backTo?: string;
    variations?: TextToMusicVariation[];
    uploadedMusic?: {
      type: 'file' | 'url';
      name: string;
      url?: string;
      file?: File;
    };
  } | null;

  if (state?.mode === 'text-to-music' && state?.variations && state.variations.length > 0) {
    return (
      <TextToMusicResult
        trackTitle={state.trackTitle || 'AI Track'}
        genre={state.genre || 'AI'}
        prompt={state.prompt}
        variations={state.variations}
        onBack={() => navigate(state.backTo || '/ai-remix')}
      />
    );
  }

  return (
    <MusicResult
      mode={state?.mode === 'text-to-music' ? 'remix' : state?.mode}
      trackTitle={state?.trackTitle || 'My Remix'}
      genre={state?.genre || 'Custom'}
      era={state?.era}
      prompt={state?.prompt}
      albumArt={state?.albumArt}
      trackId={state?.trackId}
      fxConfig={state?.fxConfig}
      audioUrl={state?.audioUrl}
      songOptions={state?.songOptions}
      originalVocalUrl={state?.originalVocalUrl}
      selectedVariation={state?.selectedVariation}
      onBack={() => navigate(state?.backTo || '/ai-remix')}
    />
  );
};

export default MusicResultPage;
