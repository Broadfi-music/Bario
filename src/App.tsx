import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AudioPlayerProvider } from "@/contexts/AudioPlayerContext";
import GlobalAudioPlayer from "@/components/GlobalAudioPlayer";

import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import Advanced from "@/pages/Advanced";
import Dashboard from "@/pages/Dashboard";
import DashboardSettings from "@/pages/DashboardSettings";
import DashboardProfile from "@/pages/DashboardProfile";
import NewRemix from "@/pages/NewRemix";
import Create from "@/pages/Create";
import Library from "@/pages/Library";
import Pricing from "@/pages/Pricing";
import CreatorProfile from "@/pages/CreatorProfile";
import MusicResultPage from "@/pages/MusicResultPage";
import GlobalHeatmap from "@/pages/GlobalHeatmap";
import MusicAlpha from "@/pages/MusicAlpha";
import HeatmapDetail from "@/pages/HeatmapDetail";
import AlphaDetail from "@/pages/AlphaDetail";
import Analytics from "@/pages/Analytics";
import Megashuffle from "@/pages/Megashuffle";
import Upload from "@/pages/Upload";
import ArtistProfile from "@/pages/ArtistProfile";
import RadioStations from "@/pages/RadioStations";
import Podcasts from "@/pages/Podcasts";
import PodcastHost from "@/pages/PodcastHost";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AudioPlayerProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/advanced" element={<Advanced />} />
                <Route path="/global-heatmap" element={<GlobalHeatmap />} />
                <Route path="/global-heatmap/:id" element={<HeatmapDetail />} />
                <Route path="/music-alpha" element={<MusicAlpha />} />
                <Route path="/music-alpha/:id" element={<AlphaDetail />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/dashboard/settings" element={<DashboardSettings />} />
                <Route path="/dashboard/profile" element={<DashboardProfile />} />
                <Route path="/dashboard/new-remix" element={<NewRemix />} />
                <Route path="/dashboard/create" element={<Create />} />
                <Route path="/dashboard/library" element={<Library />} />
                <Route path="/dashboard/analytics" element={<Analytics />} />
                <Route path="/dashboard/megashuffle" element={<Megashuffle />} />
                <Route path="/dashboard/upload" element={<Upload />} />
                <Route path="/dashboard/creator/:id" element={<CreatorProfile />} />
                <Route path="/dashboard/artist/:id" element={<ArtistProfile />} />
                <Route path="/dashboard/music-result" element={<MusicResultPage />} />
                <Route path="/music-result" element={<MusicResultPage />} />
                <Route path="/radio-stations" element={<RadioStations />} />
                <Route path="/podcasts" element={<Podcasts />} />
                <Route path="/podcast-host/:hostId" element={<PodcastHost />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <GlobalAudioPlayer />
            </BrowserRouter>
          </TooltipProvider>
        </AudioPlayerProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
