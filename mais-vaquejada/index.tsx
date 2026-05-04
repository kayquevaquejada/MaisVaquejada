import React from 'react';
import ReactDOM from 'react-dom/client';

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
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
      <p style={{ marginTop: '10px', color: '#666' }}>VERSÃO DE TESTE 16</p>
    </div>
  );
}
