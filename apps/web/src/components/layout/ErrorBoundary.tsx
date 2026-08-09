import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Top-level error boundary wrapping the router `<Outlet />`.
 *
 * Catches render-time errors from any page so a single broken component
 * doesn't take down the entire app. The error is logged to the console
 * (structured for grepability) and a friendly fallback UI is rendered with
 * a "Reload" button.
 *
 * Plan §9.4: "Error boundary wraps router outlet".
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Structured log so operators can grep for it. Never log props/state
    // here — they may contain user-generated content we don't want in logs.
    console.error("[ErrorBoundary] render error", {
      name: error.name,
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
    });
  }

  handleReload = (): void => {
    // Hard reload clears component state and re-runs module init.
    window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-24 text-center">
        <span className="text-5xl">⚠️</span>
        <h1 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-50">Something went wrong</h1>
        <p className="text-sm text-zinc-500">
          The page hit an unexpected error. Try reloading — your saved
          posts, votes, and theme are preserved in local storage.
        </p>
        {this.state.error && (
          <pre className="mt-2 max-h-32 overflow-auto rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-left text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            {this.state.error.message}
          </pre>
        )}
        <button
          type="button"
          onClick={this.handleReload}
          className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-full bg-orange-600 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900"
        >
          Reload page
        </button>
      </div>
    );
  }
}
