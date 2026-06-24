import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from "@sentry/capacitor";
import * as SentryReact from "@sentry/react";
import App from './App';
import './index.css';

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    tracesSampleRate: 1.0,
  }, SentryReact.init);
} else {
  console.warn("Sentry DSN não configurado. Defina VITE_SENTRY_DSN no seu arquivo .env.");
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
