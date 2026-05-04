import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
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

const MASTER_EMAILS = ["kayquegusmao@icloud.com", "kayquegusmao276@gmail.com", "Kayquegusmao1@gmail.com", "maisvaquejada1@gmail.com", "contato@maisvaquejada.com.br"];

// ─── ViewRenderer definido FORA do App para evitar remontagem a cada render ───
interface ViewRendererProps {
  currentView: View;
  selectedEvent: any;
  selectedStore: any;
  selectedResultId: string | null;
  user: User | null;
  profileUsername: string | null;
  onFetchProfile: (userId: string, authUser?: any) => Promise<void>;
  onSetCurrentView: (view: View) => void;
  onLogout: () => void;
}

const ViewRenderer: React.FC<ViewRendererProps> = ({
  currentView,
  selectedEvent,
  selectedStore,
  selectedResultId,
  user,
  profileUsername,
  onFetchProfile,
  onSetCurrentView,
  onLogout,
}) => {
  switch (currentView) {
    case View.LOGIN:
      return <LoginView onLogin={(u) => onFetchProfile(u.id, u)} onSignUp={() => onSetCurrentView(View.SIGNUP)} onForgotPassword={() => onSetCurrentView(View.FORGOT_PASSWORD)} onRecoveryAssisted={() => onSetCurrentView(View.RECOVERY_ASSISTED)} onTerms={() => onSetCurrentView(View.TERMS)} />;
    case View.SIGNUP:
      return <SignUpView onBack={() => onSetCurrentView(View.LOGIN)} onSuccess={(u) => onFetchProfile(u.id, u)} />;
    case View.COMPLETE_PROFILE:
      return <CompleteProfileView user={user} onComplete={() => user && onFetchProfile(user.id)} onLogout={onLogout} />;
    case View.SOCIAL:
      return <SocialFeedView user={user} onMediaCreation={() => onSetCurrentView(View.MEDIA_CREATION)} />;
    case View.EVENTS:
      return <EventsView onLoginPrompt={() => onSetCurrentView(View.LOGIN)} />;
    case View.NEWS:
      return <NewsView user={user} />;
    case View.MERCADO:
      return <MarketplaceView user={user} onViewChange={onSetCurrentView} selectedStore={selectedStore} />;
    case View.PROFILE:
      return <ProfileView user={user} targetUsername={profileUsername} onLogout={onLogout} onAdminView={() => onSetCurrentView(View.ADMIN)} onSettingsView={() => onSetCurrentView(View.SETTINGS)} onProfileUpdate={() => user && onFetchProfile(user.id)} />;
    case View.MEDIA_CREATION:
      return <MediaCreationView user={user} onClose={() => onSetCurrentView(View.SOCIAL)} onSuccess={() => onSetCurrentView(View.SOCIAL)} />;
    case View.SETTINGS:
      return <SettingsView user={user} onBack={() => onSetCurrentView(View.PROFILE)} onLogout={onLogout} onAdminView={() => onSetCurrentView(View.ADMIN)} onProfileUpdate={() => user && onFetchProfile(user.id)} />;
    case View.ADMIN:
      return <AdminView user={user} />;
    case View.ADMIN_USERS:
      return <AdminUsersView user={user} />;
    case View.INTERNAL_ADS:
      return <InternalAdManager user={user} onBack={() => onSetCurrentView(View.ADMIN)} />;
    case View.AD_CREATION:
      return <MarketplaceView user={user} forceShowWizard={true} onWizardClose={() => onSetCurrentView(View.MERCADO)} onViewChange={onSetCurrentView} selectedStore={selectedStore} />;
    case View.TERMS:
      return <EULAView onBack={() => onSetCurrentView(View.LOGIN)} />;
    case View.FORGOT_PASSWORD:
      return <ForgotPasswordView onBack={() => onSetCurrentView(View.LOGIN)} />;
    case View.BLOCKED_ACCOUNT:
      return <BlockedAccountView onLogout={onLogout} />;
    case View.RECOVERY_ASSISTED:
      return <RecoveryAssistedView onBack={() => onSetCurrentView(View.LOGIN)} />;
    case View.EVENT_DETAILS:
      return <EventDetailView event={selectedEvent} user={user} onBack={() => onSetCurrentView(View.EVENTS)} />;
    case View.LEGAL_CONSENT:
      return <LegalConsentView user={user} onAccept={() => onFetchProfile(user?.id || '')} />;
    case View.STORE_DETAILS:
      return <StoreDetailView store={selectedStore} user={user} onBack={() => onSetCurrentView(View.MERCADO)} />;
    case View.RESULT_DETAIL:
      return <ResultDetailView resultId={selectedResultId || ''} onBack={() => onSetCurrentView(selectedEvent ? View.EVENT_DETAILS : View.NEWS)} />;
    case View.AUTH_CALLBACK:
      return <AuthCallback onComplete={(userId, authUser) => onFetchProfile(userId, authUser)} onFail={() => onSetCurrentView(View.LOGIN)} />;
    default:
      if (user) {
        if (!user.profile_completed) return <CompleteProfileView user={user} onComplete={() => onFetchProfile(user.id)} onLogout={onLogout} />;
        return <EventsView />;
      }
      return <LoginView onLogin={(u) => onFetchProfile(u.id, u)} onSignUp={() => onSetCurrentView(View.SIGNUP)} onForgotPassword={() => onSetCurrentView(View.FORGOT_PASSWORD)} onRecoveryAssisted={() => onSetCurrentView(View.RECOVERY_ASSISTED)} onTerms={() => onSetCurrentView(View.TERMS)} />;
  }
};

// Capturador de Erros Global para Web
if (typeof window !== 'undefined') {
  window.onerror = function(message, source, lineno, colno, error) {
    alert('ERRO DETECTADO: ' + message + '\nLinha: ' + lineno);
  };
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.LOGIN);
  const [navKey, setNavKey] = useState(Date.now());
  const [profileUsername, setProfileUsername] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [selectedStore, setSelectedStore] = useState<any>(null);
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [debugSplash, setDebugSplash] = useState<boolean>(false);
  const isFetchingProfile = useRef(false);
  const currentViewRef = useRef(currentView);
  const isMountedRef = useRef(true);
  const hasValidConsentRef = useRef(false);
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
    console.log('[App] fetchProfile iniciado para:', userId);
    if (isFetchingProfile.current) {
      console.log('[App] fetchProfile já está em execução, pulando...');
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
          setCurrentView(View.EVENTS);
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
      console.error('[App] Erro fatal no fetchProfile:', err);
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
      console.log('[DEBUG] 🏁 Startup iniciada');
      if (isInitializedRef.current) {
        console.log('[DEBUG] ⏩ Já inicializado, pulando...');
        return;
      }
      
      try {
        console.log('[DEBUG] 🌐 Verificando plataforma e URL...');
        
        // ALERTA DE DIAGNÓSTICO (Remover após teste)
        if (typeof window !== 'undefined') {
           console.log('App URL:', window.location.href);
        }

        // DETECÇÃO UNIVERSAL DE CALLBACK (Apple/Google)
        const hasAuthParams = window.location.hash.includes('access_token') || 
                            window.location.search.includes('code=') ||
                            window.location.pathname.startsWith('/auth/callback');

        if (hasAuthParams) {
          console.log('[DEBUG] 🔗 Parâmetros de autenticação detectados');
          setCurrentView(View.AUTH_CALLBACK);
          setInitializing(false);
          isInitializedRef.current = true;
          return;
        }

        console.log('[DEBUG] 📦 Carregando perfil do cache...');
        const cached = await getCachedProfile();
        if (cached && isMountedRef.current) {
          console.log('[DEBUG] ✅ Cache encontrado:', cached.username);
          setUser(cached);
        }

        console.log('[DEBUG] 🔑 Obtendo sessão do Supabase...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('[DEBUG] ❌ Erro ao obter sessão:', sessionError);
        }

        console.log('[DEBUG] 👤 Sessão recuperada:', session ? 'Sim' : 'Não');
        
        if (session?.user) {
          console.log('[DEBUG] 🚀 Buscando perfil no banco para:', session.user.id);
          await fetchProfile(session.user.id, session.user);
        } else {
          console.log('[DEBUG] 🚪 Nenhuma sessão, redirecionando para LOGIN');
          setCurrentView(View.LOGIN);
          setInitializing(false);
        }
      } catch (err: any) {
        console.error('[DEBUG] 🚨 Erro crítico no startup:', err);
        setFatalError(err.message || 'Erro desconhecido na inicialização');
        setInitializing(false);
      } finally {
        console.log('[DEBUG] 🏁 Startup finalizada');
        isInitializedRef.current = true;
      }
    };

    startup();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMountedRef.current) return;

      if (session?.user) {
        // SIGNED_IN pode disparar várias vezes dependendo do provedor, fetchProfile cuida do ref
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

    const stateListener = CapApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive && isMountedRef.current) {
        // Ao voltar do background, apenas verifica se a sessão ainda é válida silenciamente
        // NÃO ativa initializing(true) para não piscar splash
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user && isMountedRef.current) {
            // Atualiza em background sem travar UI
            fetchProfile(session.user.id, session.user);
          }
        });
      }
    });

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
      stateListener.then(l => l.remove());
    };

  }, []);

  useEffect(() => {
    const handleNav = (e: any) => {
      const view = e.detail?.view || currentView;
      const username = e.detail?.username ?? null;
      const eventData = e.detail?.event ?? null;
      const resultId = e.detail?.resultId ?? null;

      if (!user && ![View.LOGIN, View.SIGNUP, View.FORGOT_PASSWORD, View.RECOVERY_ASSISTED, View.TERMS].includes(view)) {
        setCurrentView(View.LOGIN);
        return;
      }

      // NOVO: Bloqueio agressivo de navegação se não houver aceite legal
      if (user && !hasValidConsentRef.current && ![View.LOGIN, View.SIGNUP, View.LEGAL_CONSENT].includes(view)) {
        setCurrentView(View.LEGAL_CONSENT);
        return;
      }

      setCurrentView(view);
      setNavKey(Date.now());
      if (username !== undefined) setProfileUsername(username);
      if (eventData !== undefined) setSelectedEvent(eventData);
      if (e.detail?.store !== undefined) setSelectedStore(e.detail.store);
      if (resultId !== undefined) setSelectedResultId(resultId);

      // Persistir última view para restauração no próximo boot
      if (user && ![View.LOGIN, View.SIGNUP, View.COMPLETE_PROFILE, View.LEGAL_CONSENT].includes(view)) {
        Preferences.set({ key: 'arena_last_view', value: view });
        if (e.detail?.store) Preferences.set({ key: 'arena_last_store', value: JSON.stringify(e.detail.store) });
        if (eventData) Preferences.set({ key: 'arena_last_event', value: JSON.stringify(eventData) });
      }

      
      try {
        const stateObj = { view, username, event: eventData };
        if (username) window.history.pushState(stateObj, '', `/perfil/${username}`);
        else if (view === View.PROFILE) window.history.pushState(stateObj, '', `/perfil`);
        else if (view === View.SOCIAL) window.history.pushState(stateObj, '', `/arena`);
        else if (view === View.EVENT_DETAILS) window.history.pushState(stateObj, '', `/evento`);
        else if (view === View.EVENTS) window.history.pushState(stateObj, '', `/`);
        else if (view === View.NEWS) window.history.pushState(stateObj, '', `/noticias`);
        else if (view === View.MERCADO) window.history.pushState(stateObj, '', `/mercado`);
      } catch (e) {}
    };

    const handlePopState = (e: PopStateEvent) => {
      if (e.state) {
        setCurrentView(e.state.view);
        setProfileUsername(e.state.username);
        setNavKey(Date.now());
      }
    };

    window.addEventListener('arena_navigate', handleNav);
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('arena_navigate', handleNav);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [user, currentView]);

  // ViewRenderer agora é um componente de módulo (definido acima do App)
  // Passamos as props necessárias para evitar remontagem a cada render

  const showNavbar = user && ![View.LOGIN, View.SIGNUP, View.FORGOT_PASSWORD, View.COMPLETE_PROFILE, View.BLOCKED_ACCOUNT, View.RECOVERY_ASSISTED, View.AD_CREATION, View.LEGAL_CONSENT].includes(currentView);

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
        <div className="min-h-screen flex flex-col bg-background-dark overflow-hidden">
          <UpdateManager />
          <div className="flex-1 overflow-y-auto relative scroll-smooth hide-scrollbar">
            <div key={`${currentView}-${navKey}`} className="max-w-7xl mx-auto w-full h-full">
              <ViewRenderer
                currentView={currentView}
                selectedEvent={selectedEvent}
                selectedStore={selectedStore}
                selectedResultId={selectedResultId}
                user={user}
                profileUsername={profileUsername}
                onFetchProfile={fetchProfile}
                onSetCurrentView={setCurrentView}
                onLogout={handleLogout}
              />
            </div>
          </div>
          {showNavbar && <Navbar currentView={currentView} user={user} />}
          <CallBar />
          <CallScreen />
          {user && user.profile_completed && <PushOnboardingModal userId={user.id} />}
        </div>
      </CallProvider>
    </ErrorBoundary>
  );
};

// ─── Componente de Callback de Autenticação ───
const AuthCallback: React.FC<{ onComplete: (userId: string, authUser: any) => void, onFail: () => void }> = ({ onComplete, onFail }) => {
  const [logs, setLogs] = useState<string[]>(['[1] Iniciando processamento...']);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const addLog = (msg: string) => {
    console.log(`[AuthCallback] ${msg}`);
    setLogs(prev => [...prev.slice(-4), msg]);
  };

  const handleAuth = async () => {
    try {
      addLog('Processando login social...');
      
      // Pequeno delay para garantir que o Supabase processou os dados da URL
      await new Promise(r => setTimeout(r, 1500));
      
      const { data, error } = await supabase.auth.getSession();
      
      if (error) throw error;
      
      if (data?.session?.user) {
        addLog('Sessão validada com sucesso!');
        onComplete(data.session.user.id, data.session.user);
      } else {
        addLog('Sessão não identificada, tentando recuperação...');
        const { data: { user }, error: userErr } = await supabase.auth.getUser();
        if (user) {
           onComplete(user.id, user);
        } else {
           throw new Error('Sessão expirada ou inválida');
        }
      }
    } catch (err: any) {
      console.error('Erro no login:', err);
      addLog('Erro: ' + (err.message || 'Falha na autenticação'));
      setErrorMsg(err.message || 'Erro ao processar login');
      setTimeout(() => onFail(), 3000);
    }
  };

  useEffect(() => {
    handleAuth();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0F0A05] px-8 text-center">
      {!errorMsg ? (
        <>
          <div className="w-12 h-12 border-4 border-[#ECA413]/30 border-t-[#ECA413] rounded-full animate-spin mb-6" />
          <h1 className="text-white font-black italic uppercase tracking-widest text-sm animate-pulse">Finalizando login...</h1>
          <p className="text-white/20 text-[10px] uppercase mt-2">Autenticando com a Apple Arena</p>
          
          {/* Logs de depuração discretos */}
          <div className="mt-8 opacity-10">
             {logs.map((log, i) => (
               <div key={i} className="text-[8px] font-mono">{log}</div>
             ))}
          </div>
        </>
      ) : (
        <div>
          <div style={{ color: '#ff4444', fontSize: '40px', marginBottom: '20px' }}>⚠️</div>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '10px' }}>Ops! Algo deu errado</h2>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginBottom: '30px', maxWidth: '300px' }}>{errorMsg}</p>
          <button 
            onClick={onFail}
            style={{
              backgroundColor: '#ECA413',
              color: 'black',
              padding: '12px 30px',
              borderRadius: '25px',
              border: 'none',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            VOLTAR E TENTAR NOVAMENTE
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
