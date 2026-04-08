import { Route, Switch, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppStateProvider, useAppState } from "@/hooks/use-app-state";
import SetupWizard from "./components/SetupWizard";
import UpdateBadge from "./components/UpdateBadge";
import HomePage from "@/pages/HomePage";
import StatsPage from "@/pages/StatsPage";
import ModelsPage from "@/pages/ModelsPage";
import EndpointsPage from "@/pages/EndpointsPage";
import NotFound from "@/pages/not-found";

// ---------------------------------------------------------------------------
// Theme initialization
// ---------------------------------------------------------------------------
function initTheme() {
  const stored = localStorage.getItem("theme");
  if (stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
    document.documentElement.classList.add("dark");
  }
}
initTheme();

// ---------------------------------------------------------------------------
// Inner layout (needs AppState context)
// ---------------------------------------------------------------------------
function AppShell() {
  const { baseUrl, apiKey, setApiKey, showWizard, setShowWizard } = useAppState();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Header */}
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="text-sm font-semibold flex-1">Replit2Api</h1>
          <UpdateBadge baseUrl={baseUrl} apiKey={apiKey} />
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 max-w-5xl mx-auto w-full">
          <Switch>
            <Route path="/" component={HomePage} />
            <Route path="/stats" component={StatsPage} />
            <Route path="/models" component={ModelsPage} />
            <Route path="/endpoints" component={EndpointsPage} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </SidebarInset>

      {/* Setup Wizard overlay */}
      {showWizard && (
        <SetupWizard
          baseUrl={baseUrl}
          onComplete={(key) => { if (key) setApiKey(key); sessionStorage.setItem("wizard_dismissed", "1"); setShowWizard(false); }}
          onDismiss={() => { sessionStorage.setItem("wizard_dismissed", "1"); setShowWizard(false); }}
        />
      )}
    </SidebarProvider>
  );
}

// ---------------------------------------------------------------------------
// App root
// ---------------------------------------------------------------------------
export default function App() {
  return (
    <Router hook={useHashLocation}>
      <AppStateProvider>
        <AppShell />
      </AppStateProvider>
    </Router>
  );
}
