import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from "@sentry/capacitor";
import * as SentryReact from "@sentry/react";
import App from './App';
import './index.css';

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;

// 🔍 DIAGNÓSTICO: verifique este log no console do navegador (F12 → Console)
console.log('[Sentry] ' + (sentryDsn ? 'DSN carregado ✅' : 'DSN ausente ❌ — defina VITE_SENTRY_DSN na Vercel'));

if (sentryDsn) {
  Sentry.init(
    {
      dsn: sentryDsn,
      tracesSampleRate: 1.0,
      debug: false, // mude para true temporariamente se precisar ver logs detalhados
    },
    SentryReact.init,
  );
  console.log('[Sentry] Inicializado com sucesso ✅');
} else {
  console.warn('[Sentry] ❌ NÃO inicializado. Eventos NÃO serão enviados ao painel.');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
