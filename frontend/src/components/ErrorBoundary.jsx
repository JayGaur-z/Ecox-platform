import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/dashboard';
  };

  handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const errorMessage =
        this.state.error?.message ||
        (typeof this.state.error === 'string' ? this.state.error : 'An unexpected error occurred.');

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-xl border border-rose-100 text-center">
            <div className="w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-rose-600">
              <AlertTriangle size={32} />
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Something went wrong on this page
            </h1>

            <p className="text-sm text-gray-500 mb-6">
              EcoX encountered an unexpected issue while rendering this section. Your account and data are safe.
            </p>

            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-left mb-6 overflow-hidden">
              <p className="text-xs font-semibold uppercase tracking-wider text-rose-700 mb-1">
                Error Details
              </p>
              <p className="text-xs font-mono text-rose-800 break-words whitespace-pre-wrap max-h-32 overflow-y-auto">
                {errorMessage}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm shadow-md shadow-green-600/20"
              >
                <Home size={16} /> Return to Dashboard
              </button>
              <button
                onClick={this.handleReload}
                className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <RefreshCw size={16} /> Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
