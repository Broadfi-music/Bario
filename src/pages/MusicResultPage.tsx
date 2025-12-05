import { useLocation, useNavigate } from 'react-router-dom';
import { MusicResult } from '@/components/MusicResult';
import type { FxConfig } from '@/hooks/useAudioRemix';

const MusicResultPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as {
    trackTitle?: string;
    genre?: string;
    era?: string;
    prompt?: string;
    albumArt?: string;
    trackId?: string;
    fxConfig?: FxConfig;
    audioUrl?: string;
    uploadedMusic?: {
      type: 'file' | 'url';
      name: string;
      url?: string;
      file?: File;
    };
  } | null;

  return (
    <MusicResult
      trackTitle={state?.trackTitle || 'My Remix'}
      genre={state?.genre || 'Custom'}
      era={state?.era}
      prompt={state?.prompt}
      albumArt={state?.albumArt}
      trackId={state?.trackId}
      fxConfig={state?.fxConfig}
      audioUrl={state?.audioUrl}
      onBack={() => navigate('/')}
    />
  );
};

export default MusicResultPage;