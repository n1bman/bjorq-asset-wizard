import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  errorMessage: string | null;
}

export class PreviewErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message || "Unknown error" };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[PreviewErrorBoundary] Caught render error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 p-6 rounded-lg bg-muted/30 text-center min-h-[200px]">
          <AlertTriangle className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm font-medium text-muted-foreground">
            {this.props.fallbackMessage ?? "Preview unavailable"}
          </p>
          {this.state.errorMessage && (
            <p className="text-xs text-muted-foreground/70 font-mono max-w-sm break-all">
              {this.state.errorMessage}
            </p>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
