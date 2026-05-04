import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { APP_VERSION, RemoteConfig } from '../lib/version';

const UpdateManager: React.FC = () => {
  const [remoteConfig, setRemoteConfig] = useState<RemoteConfig | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const checkVersion = async () => {
      try {
        // Tenta buscar primeiro do arquivo local (Vercel) para resposta imediata ao subir código
        const response = await fetch('/version.json?t=' + Date.now());
        if (response.ok) {
          const config = await response.json() as RemoteConfig;
          setRemoteConfig(config);
          if (config.latest_version_code > APP_VERSION.code) {
            setShowModal(true);
            return; // Já resolveu
          }
        }

        // Fallback: Busca do Supabase se o arquivo falhar ou não houver atualização no arquivo
        const { data, error } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'android_version_control')
          .maybeSingle();

        if (error) throw error;
        
        if (data && data.value) {
          const config = data.value as RemoteConfig;
          setRemoteConfig(config);
          if (config.latest_version_code > APP_VERSION.code) {
            setShowModal(true);
          }
        }
      } catch (err) {
        console.error('Erro ao verificar atualização:', err);
      }
    };

    // Verificar ao carregar e também quando o app volta do background (se possível no webview)
    checkVersion();
    
    // Opcional: Verificar a cada 1 hora se o app ficar aberto muito tempo
    const interval = setInterval(checkVersion, 1000 * 60 * 60);
    return () => clearInterval(interval);
  }, []);

  if (!showModal || !remoteConfig) return null;

  const isCritical = APP_VERSION.code < remoteConfig.min_required_version || remoteConfig.force_update;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-500">
      <div className="w-full max-w-sm bg-[#1A1108] border border-[#ECA413]/30 rounded-[32px] p-8 shadow-[0_0_50px_rgba(234,164,19,0.2)] animate-in zoom-in duration-300">
        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-[#ECA413]/10 rounded-full flex items-center justify-center mb-6 border border-[#ECA413]/20">
            <span className="material-icons text-[#ECA413] text-4xl">system_update</span>
          </div>
          
          <h2 className="text-[#ECA413] text-xl font-black uppercase italic tracking-tighter mb-2">
            {remoteConfig.title}
          </h2>
          
          <div className="px-3 py-1 bg-white/5 rounded-full mb-4">
            <span className="text-white/40 text-[10px] font-bold uppercase tracking-widest">
              Versão Atual: {APP_VERSION.name} → <span className="text-[#ECA413]">Nova: {remoteConfig.latest_version_name}</span>
            </span>
          </div>

          <p className="text-white/70 text-sm leading-relaxed mb-8">
            {remoteConfig.message}
          </p>

          <div className="w-full space-y-3">
            <a
              href={remoteConfig.apk_url}
              className="block w-full bg-[#ECA413] text-black py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-center"
            >
              Atualizar Agora
            </a>
            
            {!isCritical && (
              <button
                onClick={() => setShowModal(false)}
                className="w-full py-2 text-white/30 text-[10px] font-bold uppercase tracking-widest hover:text-white/60 transition-colors"
              >
                Lembrar mais tarde
              </button>
            )}
          </div>
          
          {isCritical && (
            <p className="mt-6 text-[9px] font-bold text-red-500/60 uppercase tracking-tighter">
              * Esta atualização é obrigatória para continuar usando a Arena
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpdateManager;
