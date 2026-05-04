import React from 'react';
import ReactDOM from 'react-dom/client';
// import App from './App'; // Comentado para isolamento total

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// TELA DE DIAGNÓSTICO MÍNIMA (Isolamento Total - FUNDO BRANCO)
root.render(
  <React.StrictMode>
    <div style={{ 
      minHeight: '100vh', 
      background: '#ffffff', 
      color: '#000000', 
      padding: '40px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'center',
      fontFamily: 'sans-serif'
    }}>
      <h1 style={{ margin: 0, fontSize: '32px' }}>+VAQUEJADA</h1>
      <p style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '20px' }}>APP CARREGOU NO IOS</p>
      <p style={{ marginTop: '10px', color: '#666' }}>Se você vê esta tela branca, o problema está no App.tsx</p>
    </div>
  </React.StrictMode>
);
