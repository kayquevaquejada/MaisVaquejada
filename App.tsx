import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { Browser } from '@capacitor/browser';
import { PrivacyScreen } from '@capacitor-community/privacy-screen';
import { View, User } from './types';
import Navbar from './components/Navbar';
import LoginView from './views/LoginView';
import SignUpView from './views/SignUpView';
import SocialFeedView from './views/SocialFeedView';
import EventsView from './views/EventsView';
import EventDetailView from './views/EventDetailView';
import MarketplaceView from './views/MarketView';
import NewsView from './views/NewsView';
import ProfileView from './views/ProfileView';
import StoreDetailView from './views/StoreDetailView';
import MediaCreationView from './views/MediaCreationView';
import SettingsView from './views/SettingsView';
import AdminView from './views/AdminView';
import AdminUsersView from './views/AdminUsersView';
import InternalAdManager from './components/AdminAdsManager';
import EULAView from './views/EULAView';
import ForgotPasswordView from './views/ForgotPasswordView';
import CompleteProfileView from './views/CompleteProfileView';
import BlockedAccountView from './views/BlockedAccountView';
import RecoveryAssistedView from './views/RecoveryAssistedView';
import UpdateManager from './components/UpdateManager';
import { CallProvider } from './context/CallContext';
import { CallBar } from './components/CallBar';
import { CallScreen } from './components/CallScreen';
import LegalConsentView from './views/LegalConsentView';
import { TERMS_VERSION, PRIVACY_VERSION } from './lib/constants';
import { PushOnboardingModal } from './components/PushOnboardingModal';
import ErrorBoundary from './ErrorBoundary';
import ResultDetailView from './views/ResultDetailView';
import LoginRequiredModal from './components/LoginRequiredModal';
import { persistence, PersistenceKey } from './lib/persistence';
import { getNotifText } from './lib/notifications';

// Usar Lazy para o Módulo de Leilão para evitar loops de inicialização e melhorar performance no Web
const AuctionModule = React.lazy(() => import('./AuctionModule'));

const MASTER_EMAILS = ["kayquegusmao@icloud.com", "kayquegusmao276@gmail.com", "Kayquegusmao1@gmail.com", "maisvaquejada1@gmail.com", "contato@maisvaquejada.com.br"];

const GlobalToast: React.FC<{ message: string, onClose: () => void }> = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-12 left-6 right-6 z-[2000] animate-in slide-in-from-top duration-500">
      <div className="bg-[#1A1108]/95 backdrop-blur-xl border border-[#D4AF37]/30 p-4 rounded-2xl shadow-2xl flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37]">
          <span className="material-icons">notifications_active</span>
        </div>
        <div className="flex-1">
          <p className="text-[9px] font-black text-[#D4AF37] uppercase tracking-widest mb-0.5">Nova Notificação</p>
          <p className="text-white text-xs font-bold leading-tight">{message}</p>
        </div>
        <button onClick={onClose} className="text-white/20 hover:text-white p-2">
          <span className="material-icons text-sm">close</span>
        </button>
      </div>
    </div>
  );
};

// Capturador de Erros Global para Web
if (typeof window !== 'undefined') {
  window.onerror = function(message, source, lineno, colno, error) {
    alert('ERRO DETECTADO: ' + message + '\nLinha: ' + lineno);
  };
}

// ─── Componente de Callback de Autenticação ───
const AuthCallback: React.FC<{ onComplete: (userId: string, authUser: any) => void, onFail: () => void }> = ({ onComplete, onFail }) => {
  const [logs, setLogs] = useState<string[]>(['[1] Iniciando processamento...']);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const addLog = (msg: string) => {
    console.log(`[AuthCallback] ${msg}`);
    setLogs(prev => [...prev.slice(-6), msg]);
  };

  const hasHandledAuth = React.useRef(false);

  const handleAuth = async () => {
    if (hasHandledAuth.current) return;
    hasHandledAuth.current = true;

    try {
      addLog('Verificando URL de callback...');
      const url = new URL(window.location.href);
      
      let code = url.searchParams.get('code');
      if (!code && window.location.hash.includes('code=')) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1).replace('?', '&'));
        code = hashParams.get('code');
      }

      const errorDescription = url.searchParams.get('error_description');

      if (errorDescription) {
        throw new Error(errorDescription);
      }

      if (code) {
        addLog('Código detectado, iniciando troca (PKCE)...');
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        
        if (error) {
          if (error.message.includes('already been used') || error.message.includes('flow_state_not_found')) {
            addLog('Troca PKCE já processada anteriormente.');
          } else {
            addLog('Aviso na troca de código: ' + error.message);
          }
        } else if (data?.session?.user) {
          addLog('Troca PKCE concluída com sucesso!');
          onComplete(data.session.user.id, data.session.user);
          return;
        }
      }

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        addLog('Usuário detectado. Carregando dados...');
        onComplete(currentUser.id, currentUser);
        return;
      }

      addLog('Aguardando sessão do Supabase...');
      for (let i = 0; i < 25; i++) {
        await new Promise(r => setTimeout(r, 300));
        const { data: sessionData } = await supabase.auth.getSession();
        
        if (sessionData?.session?.user) {
          addLog('Sessão sincronizada!');
          onComplete(sessionData.session.user.id, sessionData.session.user);
          return;
        }
      }

      addLog('Tentativa final de recuperação de sessão...');
      const { data: lastCheck } = await supabase.auth.getSession();
      
      if (lastCheck?.session?.user) {
        onComplete(lastCheck.session.user.id, lastCheck.session.user);
      } else {
        throw new Error('Não foi possível identificar sua sessão de login. Por favor, tente entrar novamente.');
      }
    } catch (err: any) {
      console.error('Erro no processamento da autenticação');
      addLog('Falha na sincronização final');
      setErrorMsg(err.message || 'Erro ao processar login');
      setTimeout(() => onFail(), 5000);
    }
  };

  useEffect(() => {
    handleAuth();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0F0A05] px-8 text-center">
      {!errorMsg ? (
        <div className="w-full max-w-xs">
          <div className="w-12 h-12 border-4 border-[#ECA413]/30 border-t-[#ECA413] rounded-full animate-spin mb-6 mx-auto" />
          <h1 className="text-white font-black italic uppercase tracking-widest text-sm animate-pulse">Finalizando login...</h1>
          <p className="text-white/20 text-[10px] uppercase mt-2">Autenticando com a Arena</p>
        </div>
      ) : (
        <div className="animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 mx-auto">
            <span className="material-icons text-red-500 text-4xl">error_outline</span>
          </div>
          <h2 className="text-[#ECA413] text-xl font-black uppercase tracking-tighter mb-4">Ops! Algo deu errado</h2>
          <p className="text-white/60 text-sm mb-8 leading-relaxed max-w-xs mx-auto">{errorMsg}</p>
          <button onClick={onFail} className="bg-[#ECA413] text-black px-10 py-4 rounded-full font-black text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all">VOLTAR E TENTAR NOVAMENTE</button>
        </div>
      )}
    </div>
  );
};

interface ViewRendererProps {
  currentView: View;
  user: User | null;
  selectedEvent: any;
  selectedStore: any;
  selectedResultId: string | null;
  profileUsername: string | null;
  mediaCreationMode: 'FEED' | 'STORY';
  fetchProfile: (userId: string, authUser?: any) => Promise<void>;
  setCurrentView: (view: View) => void;
  handleLogout: () => Promise<void>;
  setMediaCreationMode: (mode: 'FEED' | 'STORY') => void;
}

const ViewRenderer: React.FC<ViewRendererProps> = ({
  currentView,
  user,
  selectedEvent,
  selectedStore,
  selectedResultId,
  profileUsername,
  mediaCreationMode,
  fetchProfile,
  setCurrentView,
  handleLogout,
  setMediaCreationMode
}) => {
  switch (currentView) {
    case View.LOGIN:
      return <LoginView onLogin={(u) => fetchProfile(u.id, u)} onSignUp={() => setCurrentView(View.SIGNUP)} onForgotPassword={() => setCurrentView(View.FORGOT_PASSWORD)} onRecoveryAssisted={() => setCurrentView(View.RECOVERY_ASSISTED)} onTerms={() => setCurrentView(View.TERMS)} />;
    case View.SIGNUP:
      return <SignUpView onBack={() => setCurrentView(View.LOGIN)} onSuccess={(u) => fetchProfile(u.id, u)} />;
    case View.COMPLETE_PROFILE:
      return <CompleteProfileView user={user} onComplete={() => user && fetchProfile(user.id)} onLogout={handleLogout} />;
    case View.SOCIAL:
      return <SocialFeedView user={user} onMediaCreation={(mode) => {
        if (!user) {
          window.dispatchEvent(new CustomEvent('arena_show_login'));
          return;
        }
        setMediaCreationMode(mode);
        setCurrentView(View.MEDIA_CREATION);
      }} />;
    case View.EVENTS:
      return <EventsView user={user} onLoginPrompt={() => setCurrentView(View.LOGIN)} />;
    case View.NEWS:
      return <NewsView user={user} />;
    case View.MERCADO:
      return <MarketplaceView user={user} onViewChange={setCurrentView} selectedStore={selectedStore} />;
    case View.PROFILE:
      return <ProfileView user={user} targetUsername={profileUsername} onLogout={handleLogout} onAdminView={() => setCurrentView(View.ADMIN)} onSettingsView={() => setCurrentView(View.SETTINGS)} onProfileUpdate={() => user && fetchProfile(user.id)} />;
    case View.MEDIA_CREATION:
      return <MediaCreationView user={user} onClose={() => setCurrentView(View.SOCIAL)} onSuccess={() => setCurrentView(View.SOCIAL)} initialMode={mediaCreationMode} />;
    case View.SETTINGS:
      return <SettingsView user={user} onBack={() => setCurrentView(View.PROFILE)} onLogout={handleLogout} onAdminView={() => setCurrentView(View.ADMIN)} onProfileUpdate={() => user && fetchProfile(user.id)} />;
    case View.ADMIN:
      return <AdminView user={user} />;
    case View.ADMIN_USERS:
      return <AdminUsersView user={user} />;
    case View.INTERNAL_ADS:
      return <InternalAdManager user={user} onBack={() => setCurrentView(View.ADMIN)} />;
    case View.AD_CREATION:
      return <MarketplaceView user={user} forceShowWizard={true} onWizardClose={() => setCurrentView(View.MERCADO)} onViewChange={setCurrentView} selectedStore={selectedStore} />;
    case View.TERMS:
      return <EULAView onBack={() => setCurrentView(View.LOGIN)} />;
    case View.FORGOT_PASSWORD:
      return <ForgotPasswordView onBack={() => setCurrentView(View.LOGIN)} />;
    case View.BLOCKED_ACCOUNT:
      return <BlockedAccountView onLogout={handleLogout} />;
    case View.RECOVERY_ASSISTED:
      return <RecoveryAssistedView onBack={() => setCurrentView(View.LOGIN)} />;
    case View.EVENT_DETAILS:
      return <EventDetailView event={selectedEvent} user={user} onBack={() => setCurrentView(View.EVENTS)} />;
    case View.LEGAL_CONSENT:
      return <LegalConsentView user={user} onAccept={() => fetchProfile(user?.id || '')} />;
    case View.STORE_DETAILS:
      return <StoreDetailView store={selectedStore} user={user} onBack={() => setCurrentView(View.MERCADO)} />;
    case View.RESULT_DETAIL:
      return <ResultDetailView resultId={selectedResultId || ''} onBack={() => setCurrentView(selectedEvent ? View.EVENT_DETAILS : View.NEWS)} />;
    case View.LEILAO:
      return (
        <React.Suspense fallback={
          <div className="min-h-screen bg-[#0F0A05] flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-[#ECA413]/20 border-t-[#ECA413] rounded-full animate-spin" />
          </div>
        }>
          <AuctionModule user={user} onBack={() => setCurrentView(View.EVENTS)} />
        </React.Suspense>
      );
    case View.AUTH_CALLBACK:
      return <AuthCallback onComplete={(userId, authUser) => fetchProfile(userId, authUser)} onFail={() => setCurrentView(View.LOGIN)} />;
    default:
      if (user) {
        if (!user.profile_completed) return <CompleteProfileView user={user} onComplete={() => fetchProfile(user.id)} onLogout={handleLogout} />;
        return <EventsView user={user} onLoginPrompt={() => setCurrentView(View.LOGIN)} />;
      }
      return <LoginView onLogin={(u) => fetchProfile(u.id, u)} onSignUp={() => setCurrentView(View.SIGNUP)} onForgotPassword={() => setCurrentView(View.FORGOT_PASSWORD)} onRecoveryAssisted={() => setCurrentView(View.RECOVERY_ASSISTED)} onTerms={() => setCurrentView(View.TERMS)} />;
  }
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.LOGIN);
  const [navKey, setNavKey] = useState(Date.now());
  const [profileUsername, setProfileUsername] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [selectedStore, setSelectedStore] = useState<any>(null);
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [mediaCreationMode, setMediaCreationMode] = useState<'FEED' | 'STORY'>('FEED');
  const [initializing, setInitializing] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [debugSplash, setDebugSplash] = useState<boolean>(false);
  const [appSettings, setAppSettings] = useState<Record<string, any>>({});
  const [toast, setToast] = useState<string | null>(null);
  const isFetchingProfile = useRef(false);

  const handleNav = (view: View, { username, eventData, resultId, mode, e }: { username?: string, eventData?: any, resultId?: string, mode?: 'FEED' | 'STORY', e?: any } = {}) => {
    setCurrentView(view);
    setProfileUsername(username || null);
    setSelectedEvent(eventData || null);
    setSelectedResultId(resultId || null);
    setMediaCreationMode(mode || 'FEED');
    setNavKey(Date.now());

    // Persistir estado imediatamente para robustez em multitarefa
    persistence.save(PersistenceKey.LAST_VIEW, view);
    if (eventData) persistence.save(PersistenceKey.LAST_EVENT, eventData);
    if (e?.detail?.store) persistence.save(PersistenceKey.LAST_STORE, e.detail.store);
  };



  useEffect(() => {
    fetchSettings();

    // Realtime subscription for settings
    const channel = supabase
      .channel('app_settings_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, () => {
        fetchSettings();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await supabase.from('app_settings').select('key, value');
      if (data) {
        const settings: Record<string, any> = {};
        data.forEach(s => settings[s.key] = s.value);
        setAppSettings(settings);
      }
    } catch (e) {
      console.warn('Erro ao carregar configurações:', e);
    }
  };
  const currentViewRef = useRef(currentView);
  const isMountedRef = useRef(true);
  // Initialize the consent flag as null (unknown) to avoid premature blocking
const hasValidConsentRef = useRef<boolean | null>(null);
  const isInitializedRef = useRef(false);

  // Helper para persistir o perfil localmente (cache para boot rápido)
  const saveCachedProfile = async (profileData: any) => {
    try {
      await Preferences.set({
        key: 'cached_profile_data',
        value: JSON.stringify(profileData)
      });
    } catch (e) {
      console.warn('Erro ao salvar cache de perfil:', e);
    }
  };

  const getCachedProfile = async () => {
    try {
      const { value } = await Preferences.get({ key: 'cached_profile_data' });
      return value ? JSON.parse(value) : null;
    } catch (e) {
      return null;
    }
  };

  const getCachedNavData = async () => {
    try {
      const { value: store } = await Preferences.get({ key: 'arena_last_store' });
      const { value: event } = await Preferences.get({ key: 'arena_last_event' });
      return {
        store: store ? JSON.parse(store) : null,
        event: event ? JSON.parse(event) : null
      };
    } catch (e) {
      return { store: null, event: null };
    }
  };

  useEffect(() => {
    currentViewRef.current = currentView;
  }, [currentView]);

  const handleLogout = async () => {
    try {
      // Logout do Supabase (limpa o storage nativo)
      await supabase.auth.signOut();
      

      setUser(null);
      setCurrentView(View.LOGIN);
      hasValidConsentRef.current = false;
      
      // Limpar caches
      await Preferences.remove({ key: 'cached_profile_data' });
      await Preferences.remove({ key: 'vaquejada_auth_session' });
      localStorage.removeItem('arena_last_view');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const fetchProfile = async (userId: string, authUser?: any) => {
    if (isFetchingProfile.current) {
      return;
    }
    isFetchingProfile.current = true;
    
    if (!user && initializing && currentViewRef.current !== View.AUTH_CALLBACK) {
      setInitializing(true);
    }
    
    try {
      console.log('[App] Buscando perfil no banco...');
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*, user_legal_acceptances(*)')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      if (profile) {
        console.log('[App] Perfil encontrado:', profile.username);
        const mappedUser: User = {
          id: profile.id,
          name: profile.full_name || profile.name || 'Vaqueiro',
          email: profile.email || authUser?.email || '',
          role: profile.role,
          status: profile.status,
          profile_completed: profile.profile_completed,
          username: profile.username || '',
          avatar_url: profile.avatar_url,
          admin_mercado: profile.admin_mercado || false,
          admin_social: profile.admin_social || false,
          admin_eventos: profile.admin_eventos || false,
          admin_noticias: profile.admin_noticias || false,
          isMaster: MASTER_EMAILS.includes(profile.email?.toLowerCase() || ''),
          bio: profile.bio
        } as any;
        
        setUser(mappedUser);
        await saveCachedProfile(mappedUser);

        const lastAcceptance = profile.user_legal_acceptances?.[0];
        const hasValidConsent = !!(lastAcceptance && 
                                 lastAcceptance.terms_version === TERMS_VERSION && 
                                 lastAcceptance.privacy_version === PRIVACY_VERSION);
        
        hasValidConsentRef.current = hasValidConsent;

        if (!profile.profile_completed) {
          setCurrentView(View.COMPLETE_PROFILE);
        } else if (!hasValidConsent) {
          setCurrentView(View.LEGAL_CONSENT);
        } else {
          // Só muda para EVENTS se estivermos vindo de uma tela de "entrada" ou carregamento
          const transitionViews = [View.LOGIN, View.SIGNUP, View.AUTH_CALLBACK, View.COMPLETE_PROFILE, View.LEGAL_CONSENT];
          if (transitionViews.includes(currentViewRef.current)) {
            setCurrentView(View.EVENTS);
          }
        }
      } else if (authUser) {
        console.log('[App] Perfil não existe, criando temporário...');
        const tempUser: User = {
          id: authUser.id,
          name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || 'Vaqueiro',
          email: authUser.email || '',
          role: 'USER',
          status: 'PENDING_PROFILE',
          profile_completed: false,
          username: '',
          isMaster: authUser.email ? MASTER_EMAILS.includes(authUser.email.toLowerCase()) : false
        } as any;
        setUser(tempUser);
        setCurrentView(View.COMPLETE_PROFILE);
      }
    } catch (err: any) {
      console.error('Erro ao carregar perfil do usuário');
      setFatalError(`Erro ao carregar perfil: ${err.message || 'Erro de conexão'}`);
    } finally {
      if (isMountedRef.current) {
        isFetchingProfile.current = false;
        setInitializing(false);
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;

    // debug splash handling moved to render layer


    const startup = async () => {
      if (isInitializedRef.current) {
        return;
      }
      
      try {
        
        // Limpar sessão em nova instalação do app (evita restaurar login antigo)
        const marker = await Preferences.get({ key: 'app_installed_marker' });
        if (!marker.value) {
          await supabase.auth.signOut();
          localStorage.clear();
          sessionStorage.clear();
          await Preferences.set({ key: 'app_installed_marker', value: 'true' });
        }
        

        // DETECÇÃO UNIVERSAL DE CALLBACK (Apple/Google)
        const launchUrl = await CapApp.getLaunchUrl();
        const currentUrl = window.location.href;
        
        const hasAuthParams = currentUrl.includes('access_token') || 
                            currentUrl.includes('code=') ||
                            currentUrl.pathname?.startsWith('/auth/callback') ||
                            launchUrl?.url.includes('auth/callback');

        if (hasAuthParams || launchUrl?.url) {
          const finalUrl = launchUrl?.url || currentUrl;
          if (finalUrl.includes('auth/callback') || finalUrl.includes('code=')) {
            console.log('[App] Startup: Deep Link detectado na inicialização:', finalUrl);
            setCurrentView(View.AUTH_CALLBACK);
            setInitializing(false);
            isInitializedRef.current = true;
            
            // Simular o evento de appUrlOpen para reaproveitar a lógica
            window.dispatchEvent(new CustomEvent('arena_handle_deeplink', { detail: { url: finalUrl } }));
            return;
          }
        }

        const cached = await getCachedProfile();
        if (cached && isMountedRef.current) {
          setUser(cached);
        }

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Erro na sincronização de sessão');
        }

        
        if (session?.user) {
          const { value: lastView } = await Preferences.get({ key: 'arena_last_view' });
          const { store, event } = await getCachedNavData();
          
          if (lastView && ![View.LOGIN, View.SIGNUP, View.COMPLETE_PROFILE].includes(lastView as any)) {
            setCurrentView(lastView as View);
            if (store) setSelectedStore(store);
            if (event) setSelectedEvent(event);
            setInitializing(false);
          }
          
          await fetchProfile(session.user.id, session.user);
        } else {
          // MODO VISITANTE
          setCurrentView(View.EVENTS);
          setInitializing(false);
        }
      } catch (err: any) {
        console.error('Erro crítico na inicialização');
        setFatalError(err.message || 'Erro desconhecido na inicialização');
        setInitializing(false);
      } finally {
        isInitializedRef.current = true;
      }
    };

    startup();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMountedRef.current) return;
      // Log simplificado sem dados sensíveis
      console.log(`[App] Auth event: ${event}`);

      if (session?.user) {
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
          fetchProfile(session.user.id, session.user);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setCurrentView(View.LOGIN);
        setInitializing(false);
        hasValidConsentRef.current = false;
        Preferences.remove({ key: 'cached_profile_data' });
      }
    });

    const stateListener = CapApp.addListener('appStateChange', async ({ isActive }) => {
      if (isActive && isMountedRef.current) {
        supabase.auth.getSession();
      } else if (!isActive && isMountedRef.current) {
        // Persistir view e dados de navegação ao sair para segundo plano
        if (currentViewRef.current) {
          persistence.save('arena_last_view', currentViewRef.current);
        }
      }
    });

    // Notificações em Tempo Real (Global)
    let notifChannel: any = null;
    if (user?.id) {
       notifChannel = supabase
        .channel(`app_global_notifications_${user.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, (payload) => {
          const notif = payload.new as any;
          // Buscar nome do ator para o texto
          const text = getNotifText({
            ...notif,
            actor_username: 'Alguém'
          });
          setToast(text);
        })
        .subscribe();
    }

    const handleDeepLink = async (url: string) => {
      console.log('[App] Processando Deep Link:', url);
      
      if (url.includes('auth/callback') || url.includes('access_token=') || url.includes('code=')) {
        setCurrentView(View.AUTH_CALLBACK);
        setInitializing(false);
        
        await Browser.close();
        await new Promise(r => setTimeout(r, 800));

        let code = null;
        try {
          // Parsing robusto usando Regex para deep links
          const codeMatch = url.match(/[?&]code=([^&#]+)/);
          code = codeMatch ? codeMatch[1] : null;
          
          if (!code) {
            const rawUrl = url.replace('#', '?');
            const urlObj = new URL(rawUrl);
            code = urlObj.searchParams.get('code');
          }
        } catch (e) {
          console.error('[App] Erro ao processar URL do Deep Link:', e);
        }

        if (code) {
          console.log('[App] Deep Link: Processando código PKCE...');
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) console.error('[App] Erro na troca de código:', error.message);
          
          const currentSession = (await supabase.auth.getSession()).data.session;
          if (currentSession?.user) {
            await fetchProfile(currentSession.user.id, currentSession.user);
          } else {
            setCurrentView(View.LOGIN);
          }
        } else {
          console.log('[App] Tentando recuperar sessão via getSession...');
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData.session?.user) {
            await fetchProfile(sessionData.session.user.id, sessionData.session.user);
          } else {
            setTimeout(async () => {
                const { data: retryData } = await supabase.auth.getSession();
                if (retryData.session?.user) {
                    await fetchProfile(retryData.session.user.id, retryData.session.user);
                } else {
                    setCurrentView(View.LOGIN);
                }
            }, 2000);
          }
        }
      }
    };

    const urlOpenListener = CapApp.addListener('appUrlOpen', ({ url }) => handleDeepLink(url));
    
    const customLinkListener = (e: any) => {
      if (e.detail?.url) handleDeepLink(e.detail.url);
    };
    window.addEventListener('arena_handle_deeplink', customLinkListener);

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
      stateListener.then(l => l.remove());
      urlOpenListener.then(l => l.remove());
      window.removeEventListener('arena_handle_deeplink', customLinkListener);
    };

  }, []);

  useEffect(() => {
    const handleNavEvent = (e: any) => {
      const view = e.detail?.view || currentView;
      const username = e.detail?.username ?? null;
      const eventData = e.detail?.event ?? null;
      const resultId = e.detail?.resultId ?? null;
      const mode = e.detail?.mode ?? 'FEED';

      const publicViews = [
        View.EVENTS, 
        View.NEWS, 
        View.MERCADO, 
        View.EVENT_DETAILS, 
        View.STORE_DETAILS, 
        View.RESULT_DETAIL,
        View.LOGIN,
        View.SIGNUP,
        View.FORGOT_PASSWORD,
        View.RECOVERY_ASSISTED,
        View.TERMS,
        View.AUTH_CALLBACK
      ];

      if (!user && !publicViews.includes(view)) {
        setShowLoginModal(true);
        return;
      }

      // NOVO: Bloqueio agressivo de navegação se não houver aceite legal
      if (user && hasValidConsentRef.current === false && ![View.LOGIN, View.SIGNUP, View.LEGAL_CONSENT].includes(view)) {
        setCurrentView(View.LEGAL_CONSENT);
        return;
      }

      // Chama a função centralizada de navegação com persistência
      handleNav(view, { username, eventData, resultId, mode, e });
      
      try {
        const stateObj = { view, username, event: eventData };
        if (username) window.history.pushState(stateObj, '', `/perfil/${username}`);
        else if (view === View.PROFILE) window.history.pushState(stateObj, '', `/perfil`);
        else if (view === View.SOCIAL) window.history.pushState(stateObj, '', `/arena`);
        else if (view === View.EVENT_DETAILS) window.history.pushState(stateObj, '', `/evento`);
        else if (view === View.EVENTS) window.history.pushState(stateObj, '', `/`);
        else if (view === View.NEWS) window.history.pushState(stateObj, '', `/noticias`);
        else if (view === View.MERCADO) window.history.pushState(stateObj, '', `/mercado`);
      } catch (err) {}
    };

    window.addEventListener('arena_navigate', handleNavEvent);

    const handlePopState = (e: PopStateEvent) => {
      if (e.state) {
        setCurrentView(e.state.view);
        setProfileUsername(e.state.username);
        setNavKey(Date.now());
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('arena_navigate', handleNavEvent);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [user, currentView]);

  // ViewRenderer agora é um componente de módulo (definido acima do App)
  // Passamos as props necessárias para evitar remontagem a cada render

  const showNavbar = ![
    View.LOGIN, 
    View.SIGNUP, 
    View.FORGOT_PASSWORD, 
    View.COMPLETE_PROFILE, 
    View.BLOCKED_ACCOUNT, 
    View.RECOVERY_ASSISTED, 
    View.AD_CREATION, 
    View.LEGAL_CONSENT,
    View.AUTH_CALLBACK
  ].includes(currentView);

  if (debugSplash) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F0A05', color: 'white' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>App iniciou com sucesso</h1>
        <button
          onClick={() => setDebugSplash(false)}
          style={{ padding: '10px 20px', backgroundColor: '#ECA413', color: 'black', borderRadius: '20px', fontWeight: 'bold', border: 'none' }}
        >
          Continuar
        </button>
      </div>
    </div>
  );
}

if (initializing) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F0A05' }}>
        <div style={{ color: 'white', textAlign: 'center' }}>
           <div style={{ width: '40px', height: '40px', border: '4px solid rgba(236,164,19,0.2)', borderTop: '4px solid #ECA413', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }} />
           <h2 style={{ fontWeight: 'bold', color: '#ECA413' }}>CARREGANDO...</h2>
           <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (fatalError) {
    return (
      <div className="min-h-screen bg-[#0F0A05] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
          <span className="material-icons text-red-500 text-4xl">error_outline</span>
        </div>
        <h1 className="text-[#ECA413] text-xl font-black uppercase tracking-widest mb-4">Erro de Inicialização</h1>
        <p className="text-white/60 text-sm mb-8 leading-relaxed">
          Ocorreu um problema ao iniciar o +Vaquejada. Isso pode ser devido a uma conexão instável ou erro de configuração.
        </p>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-8 w-full max-w-sm">
          <p className="text-red-400 text-[10px] font-mono break-all">{fatalError}</p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="bg-[#ECA413] text-black px-8 py-3 rounded-full font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <CallProvider userId={user?.id}>
        <div className="h-[100dvh] flex flex-col bg-background-dark overflow-hidden">
          <UpdateManager />
          <div className="flex-1 overflow-hidden relative flex flex-col">
            {/* Mobile-style Frame for Web */}
            <div className="flex-1 w-full max-w-md mx-auto relative flex flex-col bg-[#0F0A05] shadow-2xl overflow-hidden lg:h-[90vh] lg:flex-none lg:my-auto lg:rounded-[40px] lg:border lg:border-white/5">
              <ErrorBoundary>
                <ViewRenderer 
                  currentView={currentView}
                  user={user}
                  selectedEvent={selectedEvent}
                  selectedStore={selectedStore}
                  selectedResultId={selectedResultId}
                  profileUsername={profileUsername}
                  mediaCreationMode={mediaCreationMode}
                  fetchProfile={fetchProfile}
                  setCurrentView={setCurrentView}
                  handleLogout={handleLogout}
                  setMediaCreationMode={setMediaCreationMode}
                />
              </ErrorBoundary>
            </div>

            {currentView !== View.LOGIN && currentView !== View.SIGNUP && currentView !== View.AUTH_CALLBACK && (
              <div className="max-w-md mx-auto w-full">
                <Navbar currentView={currentView} user={user} appSettings={appSettings} />
              </div>
            )}
          </div>
          <CallBar />
          <CallScreen />
          {user && user.profile_completed && <PushOnboardingModal userId={user.id} />}
          
          <LoginRequiredModal 
            isOpen={showLoginModal} 
            onClose={() => setShowLoginModal(false)} 
          />
          {toast && <GlobalToast message={toast} onClose={() => setToast(null)} />}
        </div>
      </CallProvider>
    </ErrorBoundary>
  );
};



export default App;
