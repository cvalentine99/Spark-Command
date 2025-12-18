import React from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Server, 
  Zap, 
  BrainCircuit, 
  Network, 
  Settings, 
  Search, 
  Bell, 
  User,
  Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [location] = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);

  const navItems = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Nodes", path: "/nodes", icon: Server },
    { name: "Spark Engine", path: "/spark", icon: Zap },
    { name: "Inference", path: "/inference", icon: BrainCircuit },
    { name: "Network", path: "/network", icon: Network },
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 selection:text-primary overflow-hidden flex">
      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar/80 backdrop-blur-xl border-r border-white/10 transition-transform duration-300 lg:translate-x-0 lg:static",
          !isSidebarOpen && "-translate-x-full lg:w-[70px]"
        )}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b border-white/10">
          <div className={cn("flex items-center gap-2", !isSidebarOpen && "hidden lg:flex lg:justify-center lg:w-full")}>
            <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
              <Zap className="h-5 w-5 text-white" />
            </div>
            {isSidebarOpen && <span className="font-display font-bold text-xl tracking-wider">DGX<span className="text-primary">SPARK</span></span>}
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsSidebarOpen(false)}>
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location === item.path;
            return (
              <Link key={item.path} href={item.path}>
                <div 
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 cursor-pointer group",
                    isActive 
                      ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_-5px_var(--primary)]" 
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5",
                    !isSidebarOpen && "justify-center px-0"
                  )}
                >
                  <item.icon className={cn("h-5 w-5", isActive && "animate-pulse")} />
                  {isSidebarOpen && <span className="font-medium">{item.name}</span>}
                  
                  {/* Active Indicator Line */}
                  {isActive && isSidebarOpen && (
                    <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_10px_var(--primary)]" />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* System Status Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 bg-black/20">
          {isSidebarOpen ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Cluster Status</span>
                <span className="text-green-400 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" /> Online
                </span>
              </div>
              <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-primary w-[85%]" />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                <span>CPU: 12%</span>
                <span>GPU: 85%</span>
                <span>MEM: 42%</span>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <header className="h-16 border-b border-white/10 bg-background/50 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
              <Search className="h-4 w-4" />
              <span className="opacity-50">Search commands...</span>
              <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 font-mono text-[10px] font-medium opacity-100">
                <span className="text-xs">⌘</span>K
              </kbd>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_var(--primary)]" />
            </Button>
            <div className="h-8 w-px bg-white/10" />
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-medium leading-none">Admin User</div>
                <div className="text-xs text-muted-foreground mt-1">Super Admin</div>
              </div>
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-purple-600 p-[1px]">
                <div className="h-full w-full rounded-full bg-black flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 relative">
          {/* Background Grid Pattern */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.02]" 
               style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
          />
          
          <div className="container mx-auto max-w-7xl relative z-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
