import { useLocation, useNavigate } from 'react-router-dom';
import { MusicResult } from '@/components/MusicResult';

const MusicResultPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as {
    trackTitle?: string;
    genre?: string;
    prompt?: string;
    albumArt?: string;
  } | null;

  return (
    <MusicResult
      trackTitle={state?.trackTitle || 'My Remix'}
      genre={state?.genre || 'Custom'}
      prompt={state?.prompt}
      albumArt={state?.albumArt}
      onBack={() => navigate('/')}
    />
  );
};

export default MusicResultPage;
