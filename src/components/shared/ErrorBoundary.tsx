'use client';
import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const MAX_ERROR_LOG = 20;
const ERROR_LOG_KEY = 'fundalyst-errors';

/** Log an error to localStorage for diagnostics */
function logError(err: Error): void {
  try {
    const stored = localStorage.getItem(ERROR_LOG_KEY);
    const logs: { time: string; message: string; stack?: string }[] = stored ? JSON.parse(stored) : [];
    logs.push({
      time: new Date().toISOString(),
      message: err.message || 'Unknown error',
      stack: err.stack,
    });
    // Keep only the last N errors
    if (logs.length > MAX_ERROR_LOG) logs.splice(0, logs.length - MAX_ERROR_LOG);
    localStorage.setItem(ERROR_LOG_KEY, JSON.stringify(logs));
  } catch {
    // localStorage might be full — silently fail
  }
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    logError(error);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div style={{
          padding: '3rem 2rem', textAlign: 'center', maxWidth: 480, margin: '3rem auto',
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#E5484D" strokeWidth="1.5" style={{ marginBottom: 12 }}>
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--red)', marginBottom: 8 }}>
            Something went wrong
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 16, lineHeight: 1.5 }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/** Export error log for diagnostic access */
export { ERROR_LOG_KEY };
