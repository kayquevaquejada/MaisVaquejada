import React, { useState, useEffect } from 'react';
import { AppUpdate, AppUpdateInfo } from '@capawesome/capacitor-app-update';
import { Capacitor } from '@capacitor/core';
import UpdateModal from './UpdateModal';

const UpdateManager: React.FC = () => {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const checkVersion = async () => {
      // Somente executa em plataformas nativas
      if (!Capacitor.isNativePlatform()) return;

      try {
        const result = await AppUpdate.getAppUpdateInfo();
        
        // updateAvailability: 2 = UPDATE_AVAILABLE
        if (result.updateAvailability === 2) {
          setShowModal(true);
        }
      } catch (err) {
        // Erro silencioso como solicitado pelo usuário
        console.warn('[UpdateManager] Erro ao verificar atualização:', err);
      }
    };

    checkVersion();
    
    // Verificar a cada 1 hora se o app ficar aberto muito tempo
    const interval = setInterval(checkVersion, 1000 * 60 * 60);
    return () => clearInterval(interval);
  }, []);

  return (
    <UpdateModal 
      isOpen={showModal} 
      onClose={() => setShowModal(false)} 
    />
  );
};

export default UpdateManager;
