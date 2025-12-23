import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { MainLayout } from "./components/layout/MainLayout";
import { Loader2 } from "lucide-react";

// Lazy load pages for better code splitting
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const NodesPage = lazy(() => import("./pages/NodesPage"));
const SparkPage = lazy(() => import("./pages/SparkPage"));
const NetworkPage = lazy(() => import("./pages/NetworkPage"));
const InferencePage = lazy(() => import("./pages/InferencePage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const SupportPage = lazy(() => import("./pages/SupportPage"));
const JobDetailsPage = lazy(() => import("./pages/JobDetailsPage"));
const LogsPage = lazy(() => import("./pages/LogsPage"));
const PowerPage = lazy(() => import("./pages/PowerPage"));
const BackupPage = lazy(() => import("./pages/BackupPage"));

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    </div>
  );
}

function Router() {
  return (
    <MainLayout>
      <Suspense fallback={<PageLoader />}>
        <Switch>
          <Route path={"/"} component={DashboardPage} />
          <Route path={"/nodes"} component={NodesPage} />
          <Route path={"/spark"} component={SparkPage} />
          <Route path={"/spark/job/:id"} component={JobDetailsPage} />
          <Route path={"/inference"} component={InferencePage} />
          <Route path={"/network"} component={NetworkPage} />
          <Route path={"/settings"} component={SettingsPage} />
          <Route path={"/support"} component={SupportPage} />
          <Route path={"/logs"} component={LogsPage} />
          <Route path={"/power"} component={PowerPage} />
          <Route path={"/backup"} component={BackupPage} />
          <Route path={"/404"} component={NotFound} />
          {/* Final fallback route */}
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </MainLayout>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
