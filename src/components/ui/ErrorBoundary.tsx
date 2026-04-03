import { Component, type ReactNode } from 'react';
import styles from './ErrorBoundary.module.css';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className={styles.error}>
            <span className={styles.icon}>⚠</span>
            <span className={styles.msg}>Render error: {this.state.message}</span>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
