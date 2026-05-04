import React from 'react';
import ReactDOM from 'react-dom/client';
// import App from './App'; // Comentado para isolamento total

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// TELA DE DIAGNÓSTICO MÍNIMA (Isolamento Total)
root.render(
  <React.StrictMode>
    <div style={{ 
      padding: '40px', 
      color: 'white', 
      background: 'black', 
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'center',
      fontFamily: 'sans-serif'
    }}>
      <h1 style={{ color: '#ECA413' }}>+VAQUEJADA</h1>
      <p style={{ fontSize: '20px', fontWeight: 'bold' }}>APP OK - iOS carregou a WebView</p>
      <p style={{ color: '#666', fontSize: '14px' }}>Se você está vendo isso, o Capacitor está funcionando corretamente.</p>
    </div>
  </React.StrictMode>
);
