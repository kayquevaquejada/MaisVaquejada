import React, { Component, ErrorInfo, ReactNode } from 'react';
import * as Sentry from "@sentry/capacitor";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorMessage: '' };

  constructor(props: Props) {
    super(props);
  }

  static getDerivedStateFromError(_: Error): State {
    // Atualiza o estado para que a próxima renderização mostre a UI de fallback.
    return { hasError: true, errorMessage: _.message };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Registrar o erro em um serviço de monitoramento.
    console.error('ErrorBoundary capturou um erro:', error, errorInfo);
    Sentry.captureException(error, { extra: { errorInfo } });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#0F0A05] text-white p-4">
          <div className="max-w-md text-center">
            <h1 className="text-2xl font-bold mb-4" style={{ color: '#ECA413' }}>
              Ocorreu um erro inesperado
            </h1>
            <p className="mb-6">{this.state.errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-[#ECA413] text-black rounded-full font-bold"
            >
              Reiniciar Aplicação
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
