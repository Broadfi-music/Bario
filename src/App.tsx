import { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AudioPlayerProvider } from "@/contexts/AudioPlayerContext";
import { AnimatePresence } from "framer-motion";
import GlobalAudioPlayer from "@/components/GlobalAudioPlayer";
import GlobalBattleNotification from "@/components/podcast/GlobalBattleNotification";
import GlobalJoinRequestNotification from "@/components/podcast/GlobalJoinRequestNotification";
import PushSubscriptionManager from "@/components/PushSubscriptionManager";
import SplashScreen from "@/components/SplashScreen";
import MobileBottomNav from "@/components/MobileBottomNav";
import PageTransition from "@/components/PageTransition";
import { useIsMobile } from "@/hooks/use-mobile";

import GlobalHeatmap from "@/pages/GlobalHeatmap";
import AIRemix from "@/pages/AIRemix";
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
import HeatmapDetail from "@/pages/HeatmapDetail";
import Analytics from "@/pages/Analytics";
import Upload from "@/pages/Upload";
import ArtistProfile from "@/pages/ArtistProfile";
import Podcasts from "@/pages/Podcasts";
import PodcastHost from "@/pages/PodcastHost";
import HostProfile from "@/pages/HostProfile";
import BarioMusic from "@/pages/BarioMusic";
import BarioMusicDetail from "@/pages/BarioMusicDetail";
import Rewards from "@/pages/Rewards";

import Install from "@/pages/Install";
import ResetPassword from "@/pages/ResetPassword";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const MobileHomeRedirect = () => {
  const { user, loading } = useAuth();
  const isMobile = useIsMobile();
  const isPWA = window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as any).standalone === true;

  if (loading) return null;

  // Always send authenticated users to dashboard after OAuth/login callbacks.
  if (user) return <Navigate to="/dashboard" replace />;
  
  // Only PWA gets Podcasts as home. Mobile web always gets GlobalHeatmap.
  return (isMobile && isPWA) ? <Podcasts /> : <GlobalHeatmap />;
};

const AnimatedRoutes = ({ showSplash }: { showSplash: boolean }) => {
  const location = useLocation();
  const isMobile = useIsMobile();

  if (showSplash) return null;

  return (
    <AnimatePresence mode="wait">
      <PageTransition keyProp={isMobile ? location.pathname + location.search : 'desktop'}>
        <Routes location={location}>
          <Route path="/" element={<MobileHomeRedirect />} />
          <Route path="/ai-remix" element={<AIRemix />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/advanced" element={<Advanced />} />
          <Route path="/heatmap" element={<GlobalHeatmap />} />
          <Route path="/global-heatmap" element={<GlobalHeatmap />} />
          <Route path="/global-heatmap/:id" element={<HeatmapDetail />} />
          <Route path="/heatmap/:id" element={<HeatmapDetail />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/settings" element={<DashboardSettings />} />
          <Route path="/dashboard/profile" element={<DashboardProfile />} />
          <Route path="/dashboard/new-remix" element={<NewRemix />} />
          <Route path="/dashboard/create" element={<Create />} />
          <Route path="/dashboard/library" element={<Library />} />
          <Route path="/dashboard/analytics" element={<Analytics />} />
          <Route path="/dashboard/upload" element={<Upload />} />
          <Route path="/dashboard/creator/:id" element={<CreatorProfile />} />
          <Route path="/dashboard/artist/:id" element={<ArtistProfile />} />
          <Route path="/dashboard/music-result" element={<MusicResultPage />} />
          <Route path="/music-result" element={<MusicResultPage />} />
          <Route path="/podcasts" element={<Podcasts />} />
          <Route path="/podcast-host/:hostId" element={<PodcastHost />} />
          <Route path="/host/:hostId" element={<HostProfile />} />
          <Route path="/bario-music" element={<BarioMusic />} />
          <Route path="/bario-music/:id" element={<BarioMusicDetail />} />
          <Route path="/dashboard/rewards" element={<Rewards />} />
          
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/install" element={<Install />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </PageTransition>
    </AnimatePresence>
  );
};

const App = () => {
  const [showSplash, setShowSplash] = useState(() => {
    // Only show splash on PWA (standalone mode), not regular browser
    const isPWA = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true;
    if (!isPWA) return false;
    if (sessionStorage.getItem('bario-splash-shown')) return false;
    sessionStorage.setItem('bario-splash-shown', 'true');
    return true;
  });

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AudioPlayerProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            {showSplash && (
              <SplashScreen onComplete={() => setShowSplash(false)} />
            )}
            <BrowserRouter>
              <GlobalBattleNotification />
              <GlobalJoinRequestNotification />
              <PushSubscriptionManager />
              <AnimatedRoutes showSplash={showSplash} />
              <MobileBottomNav />
              <GlobalAudioPlayer />
            </BrowserRouter>
          </TooltipProvider>
        </AudioPlayerProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
