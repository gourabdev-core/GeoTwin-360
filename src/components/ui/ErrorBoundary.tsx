import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from './Button.js';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[React Error Boundary] Caught uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center text-center p-8 bg-dark-surface rounded-lg min-h-[300px] border border-negative-red/20 max-w-lg mx-auto my-8">
          <div className="mb-4 flex items-center justify-center p-4 bg-negative-red/10 rounded-full">
            <AlertCircle size={48} className="text-negative-red" />
          </div>
          <h3 className="text-lg font-title font-bold text-text-base mb-2">
            Something went wrong while loading this page
          </h3>
          <p className="text-sm text-text-silver mb-6 leading-relaxed">
            An unexpected rendering error occurred inside the application shell.
          </p>
          <Button variant="outline" size="sm" onClick={this.handleReset}>
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
export default ErrorBoundary;
