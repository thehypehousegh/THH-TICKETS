import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from './ui';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Without this, any single uncaught error thrown during render anywhere in
 * the tree (a bad API response, a Firestore permission error surfacing
 * during a re-render, anything) unmounts the ENTIRE app to a blank screen
 * with no way back except a manual reload -- there is no other error
 * boundary in this app. This turns that into a recoverable screen instead,
 * and logs the real error to the console so it's diagnosable next time.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] caught:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
          <h1 className="text-xl font-semibold text-text">Something went wrong</h1>
          <p className="text-sm text-text-dim">
            An unexpected error occurred. Reloading the page usually fixes it.
          </p>
          <p className="max-w-full overflow-x-auto whitespace-pre-wrap rounded-lg bg-surface p-3 text-left font-mono text-xs text-danger">
            {this.state.error.message}
          </p>
          <Button onClick={() => window.location.reload()}>Reload page</Button>
        </div>
      );
    }
    return this.props.children;
  }
}
