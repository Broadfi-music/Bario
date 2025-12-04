import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";

// Lazy load pages to help with any import errors
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Advanced = lazy(() => import("./pages/Advanced"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const DashboardSettings = lazy(() => import("./pages/DashboardSettings"));
const DashboardProfile = lazy(() => import("./pages/DashboardProfile"));
const NewRemix = lazy(() => import("./pages/NewRemix"));
const Create = lazy(() => import("./pages/Create"));
const Library = lazy(() => import("./pages/Library"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Pricing = lazy(() => import("./pages/Pricing"));
const CreatorProfile = lazy(() => import("./pages/CreatorProfile"));
const MusicResultPage = lazy(() => import("./pages/MusicResultPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

console.log("App.tsx loaded");

const LoadingFallback = () => (
  <div style={{ 
    minHeight: '100vh', 
    backgroundColor: '#000', 
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }}>
    <p>Loading...</p>
  </div>
);

const App = () => {
  console.log("App component rendering");
  
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/advanced" element={<Advanced />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/dashboard/settings" element={<DashboardSettings />} />
              <Route path="/dashboard/profile" element={<DashboardProfile />} />
              <Route path="/dashboard/new-remix" element={<NewRemix />} />
              <Route path="/dashboard/create" element={<Create />} />
              <Route path="/dashboard/library" element={<Library />} />
              <Route path="/dashboard/analytics" element={<Analytics />} />
              <Route path="/dashboard/creator/:id" element={<CreatorProfile />} />
              <Route path="/dashboard/music-result" element={<MusicResultPage />} />
              <Route path="/music-result" element={<MusicResultPage />} />
              <Route path="/pricing" element={<Pricing />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;