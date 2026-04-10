import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class SocialErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('SocialErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className="flex flex-col items-center justify-center p-10 text-center bg-background-dark min-h-[400px]">
          <span className="material-icons text-red-500 text-6xl mb-4">error_outline</span>
          <h2 className="text-[#ECA413] font-black uppercase tracking-tighter mb-2 italic">Algo deu errado na área social</h2>
          <p className="text-white/60 text-xs mb-6 max-w-xs">
            {this.state.error?.message || 'Ocorreu um erro inesperado ao carregar o feed social.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-6 py-3 bg-[#ECA413] text-background-dark rounded-full font-black uppercase text-[10px] tracking-widest active:scale-95 transition-transform"
          >
            Tentar Novamente
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
