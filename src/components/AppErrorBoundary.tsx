import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  error?: Error;
};

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    // Keep a console trail so we can diagnose "blank screen" reports.
    // eslint-disable-next-line no-console
    console.error("[AppErrorBoundary] Uncaught error:", error);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Something went wrong</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The app hit an unexpected error. Reloading usually fixes it.
            </p>
            <div className="flex gap-2">
              <Button onClick={this.handleReload}>Reload</Button>
              <Button variant="secondary" onClick={() => this.setState({ hasError: false, error: undefined })}>
                Try again
              </Button>
            </div>
            {this.state.error?.message ? (
              <pre className="text-xs bg-muted text-muted-foreground rounded-md p-3 overflow-auto">
                {this.state.error.message}
              </pre>
            ) : null}
          </CardContent>
        </Card>
      </div>
    );
  }
}
