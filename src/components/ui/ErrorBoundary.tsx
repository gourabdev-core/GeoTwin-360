import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button.js';
import { sanitizeErrorMessage } from '../../utils/errorSanitizer.js';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  title?: string;
  message?: string;
  onReset?: () => void;
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
    console.warn('[React Error Boundary] Handled render error:', sanitizeErrorMessage(error), errorInfo?.componentStack?.slice(0, 100));
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  public override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const displayMessage = this.props.message || sanitizeErrorMessage(this.state.error, 'An unexpected rendering error occurred inside this section.');

      return (
        <div className="flex flex-col items-center justify-center text-center p-8 bg-dark-surface rounded-lg min-h-[260px] border border-red-500/20 max-w-lg mx-auto my-6">
          <div className="mb-4 flex items-center justify-center p-3 bg-red-500/10 rounded-full text-red-400">
            <AlertCircle size={40} />
          </div>
          <h3 className="text-base font-title font-bold text-text-base mb-2">
            {this.props.title || 'Component Temporarily Unavailable'}
          </h3>
          <p className="text-xs text-text-silver mb-5 leading-relaxed max-w-sm">
            {displayMessage}
          </p>
          <Button variant="outline" size="sm" onClick={this.handleReset} className="flex items-center gap-1.5 text-xs">
            <RefreshCw size={12} />
            <span>Try Again</span>
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
export default ErrorBoundary;

