import React from 'react';

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-8">
          <div className="max-w-xl w-full">
            <div className="text-4xl mb-4 text-center">⚠️</div>
            <h1 className="text-xl font-bold text-red-400 mb-2 text-center">Something went wrong</h1>
            <p className="text-stone-400 text-sm text-center mb-6">
              Please copy the error below and report it, or reset your character data.
            </p>
            <pre className="bg-stone-900 border border-stone-700 rounded-lg p-4 text-xs text-red-300 overflow-auto whitespace-pre-wrap break-all mb-6">
              {this.state.error.message}
              {'\n\n'}
              {this.state.error.stack}
            </pre>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-md text-sm font-medium transition-colors"
              >
                Clear data &amp; reload
              </button>
              <button
                onClick={() => this.setState({ error: null })}
                className="px-4 py-2 bg-stone-700 hover:bg-stone-600 text-white rounded-md text-sm font-medium transition-colors"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
