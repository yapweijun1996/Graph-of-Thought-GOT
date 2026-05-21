import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

// Last-resort boundary for render crashes (Phase 6.2). Text is intentionally
// plain English: i18n itself may be the thing that crashed, so the fallback
// must not depend on it. Render crashes are not retriable in place — the only
// safe recovery is a reload.
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[errorboundary]', error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-3 bg-background p-6 text-center text-foreground">
        <h1 className="text-lg font-semibold">Something went wrong</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          {this.state.error.message}
        </p>
        <button
          className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          onClick={() => window.location.reload()}
        >
          Reload
        </button>
      </div>
    );
  }
}
