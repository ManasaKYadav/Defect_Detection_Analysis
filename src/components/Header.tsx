import { Activity, Settings, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/UserMenu";

export function Header() {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 gradient-border">
              <Activity className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Defect<span className="text-gradient">Vision</span>
              </h1>
              <p className="text-xs text-muted-foreground font-mono">AI Quality Control System</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-secondary/50 rounded-lg border border-border">
              <span className="w-2 h-2 rounded-full bg-success status-pulse" />
              <span className="text-xs font-mono text-muted-foreground">
                System Status: <span className="text-success">OPERATIONAL</span>
              </span>
            </div>

            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive" />
            </Button>

            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5 text-muted-foreground" />
            </Button>

            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
