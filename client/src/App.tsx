import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { MainLayout } from "./components/layout/MainLayout";
import DashboardPage from "./pages/DashboardPage";
import NodesPage from "./pages/NodesPage";
import SparkPage from "./pages/SparkPage";
import NetworkPage from "./pages/NetworkPage";
import InferencePage from "./pages/InferencePage";
import SettingsPage from "./pages/SettingsPage";

function Router() {
  return (
    <MainLayout>
      <Switch>
        <Route path={"/"} component={DashboardPage} />
        <Route path={"/nodes"} component={NodesPage} />
        <Route path={"/spark"} component={SparkPage} />
        <Route path={"/inference"} component={InferencePage} />
        <Route path={"/network"} component={NetworkPage} />
        <Route path={"/settings"} component={SettingsPage} />
        <Route path={"/404"} component={NotFound} />
        {/* Final fallback route */}
        <Route component={NotFound} />
      </Switch>
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
