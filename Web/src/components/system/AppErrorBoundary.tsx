import { AlertTriangle, Copy, RefreshCcw } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

type BoundaryState = {
  hasError: boolean;
  errorCode: string;
  message: string;
  detail?: string;
};

function makeErrorCode(prefix = 'EDY') {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${prefix}-${stamp}-${random}`;
}

export class AppErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = {
    hasError: false,
    errorCode: '',
    message: ''
  };

  private onWindowError = (event: ErrorEvent) => {
    this.setState({
      hasError: true,
      errorCode: makeErrorCode('EDY-UI'),
      message: event.message || 'Unexpected application error',
      detail: event.error instanceof Error ? event.error.stack ?? event.error.message : String(event.message ?? 'Unknown error')
    });
  };

  private onUnhandledRejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason instanceof Error
      ? event.reason
      : new Error(typeof event.reason === 'string' ? event.reason : 'Unhandled promise rejection');
    this.setState({
      hasError: true,
      errorCode: makeErrorCode('EDY-ASYNC'),
      message: reason.message || 'Unhandled promise rejection',
      detail: reason.stack ?? reason.message
    });
  };

  static getDerivedStateFromError(error: Error): Partial<BoundaryState> {
    return {
      hasError: true,
      errorCode: makeErrorCode('EDY-CRASH'),
      message: error.message || 'Unexpected render error',
      detail: error.stack ?? error.message
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState((current) => ({
      ...current,
      detail: [error.stack ?? error.message, info.componentStack].filter(Boolean).join('\n\n')
    }));
  }

  componentDidMount() {
    window.addEventListener('error', this.onWindowError);
    window.addEventListener('unhandledrejection', this.onUnhandledRejection);
  }

  componentWillUnmount() {
    window.removeEventListener('error', this.onWindowError);
    window.removeEventListener('unhandledrejection', this.onUnhandledRejection);
  }

  private copyErrorCode = async () => {
    const payload = `${this.state.errorCode}\n${this.state.message}\n${this.state.detail ?? ''}`.trim();
    try {
      await navigator.clipboard.writeText(payload);
    } catch {
      // Clipboard access is best-effort here.
    }
  };

  private reloadApp = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="app-crash-screen">
          <section className="app-crash-card">
            <div className="app-crash-icon">
              <AlertTriangle size={34} />
            </div>
            <div className="app-crash-copy">
              <span className="app-crash-kicker">Application Error</span>
              <h1>Edify ran into an unexpected error.</h1>
              <p>
                Please contact support and share the error code below.
                This helps us identify the issue faster.
              </p>
            </div>
            <div className="app-crash-meta">
              <span>Error code</span>
              <strong>{this.state.errorCode}</strong>
            </div>
            <div className="app-crash-meta">
              <span>Error</span>
              <strong>{this.state.message}</strong>
            </div>
            <div className="app-crash-actions">
              <button className="secondary-button" type="button" onClick={() => void this.copyErrorCode()}>
                <Copy size={15} />
                Copy error code
              </button>
              <button className="primary-button" type="button" onClick={this.reloadApp}>
                <RefreshCcw size={15} />
                Reload Edify
              </button>
            </div>
            {this.state.detail ? (
              <details className="app-crash-details">
                <summary>Technical details</summary>
                <pre>{this.state.detail}</pre>
              </details>
            ) : null}
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
