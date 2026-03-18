import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ConnectionProvider } from "@/contexts/ConnectionContext";
import { AppLayout } from "@/components/layout/AppLayout";
import UploadAnalyze from "@/pages/UploadAnalyze";
import Optimize from "@/pages/Optimize";
import Catalog from "@/pages/Catalog";
import AssetDetail from "@/pages/AssetDetail";
import CatalogIngest from "@/pages/CatalogIngest";
import SystemStatus from "@/pages/SystemStatus";
import NotFound from "@/pages/NotFound";
import WizardIntegration from "@/pages/WizardIntegration";
import PhotoGenerate from "@/pages/PhotoGenerate";

const queryClient = new QueryClient();

function getBasename(): string {
  const path = window.location.pathname;
  const ingressMatch = path.match(/^(\/api\/hassio_ingress\/[^/]+)/);
  if (ingressMatch) return ingressMatch[1];
  return "/";
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ConnectionProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename={getBasename()}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<UploadAnalyze />} />
              <Route path="/optimize" element={<Optimize />} />
              <Route path="/catalog" element={<Catalog />} />
              <Route path="/catalog/:id" element={<AssetDetail />} />
              <Route path="/ingest" element={<CatalogIngest />} />
              <Route path="/system" element={<SystemStatus />} />
              <Route path="/wizard" element={<WizardIntegration />} />
              <Route path="/generate" element={<PhotoGenerate />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ConnectionProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
