import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase';
import { App as CapApp } from '@capacitor/app';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
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
import StoreDetailView from './views/StoreDetailView';
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
      return <NewsView />;
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
      return <EventDetailView event={selectedEvent} onBack={() => onSetCurrentView(View.EVENTS)} />;
    case View.LEGAL_CONSENT:
      return <LegalConsentView user={user} onAccept={() => onFetchProfile(user?.id || '')} />;
    case View.STORE_DETAILS:
      return <StoreDetailView store={selectedStore} user={user} onBack={() => onSetCurrentView(View.MERCADO)} />;
    case View.RESULT_DETAIL:
      return <ResultDetailView resultId={selectedResultId || ''} onBack={() => onSetCurrentView(selectedEvent ? View.EVENT_DETAILS : View.NEWS)} />;
    default:
      if (!user || !user.profile_completed) return <LoginView onLogin={(u) => onFetchProfile(u.id, u)} onSignUp={() => onSetCurrentView(View.SIGNUP)} onForgotPassword={() => onSetCurrentView(View.FORGOT_PASSWORD)} onRecoveryAssisted={() => onSetCurrentView(View.RECOVERY_ASSISTED)} onTerms={() => onSetCurrentView(View.TERMS)} />;
      return <EventsView />;
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
  const [initializing, setInitializing] = useState(true);
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
      
      // Logout do Google (limpa o seletor de contas se necessário)
      if (Capacitor.isNativePlatform()) {
        try {
          await GoogleAuth.signOut();
        } catch (e) {
          console.warn('Google signout skip or fail:', e);
        }
      }

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
    if (isFetchingProfile.current) return;
    isFetchingProfile.current = true;
    
    // Só mostramos o carregamento total se for a PRIMEIRA inicialização do app
    // Nunca definimos setInitializing(true) novamente após o app ter aberto uma vez
    if (!user && initializing) setInitializing(true);
    
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*, user_legal_acceptances(*)')
        .eq('id', userId)
        .maybeSingle();

      let targetProfile = profile;
      if (error) {
        console.error('Supabase Profile Fetch Error:', error);
        const { data: fallback } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
        targetProfile = fallback;
      }

      if (targetProfile) {
        const profile = targetProfile;
        const mappedUser: User = {
          id: profile.id,
          name: profile.full_name || profile.name || 'Vaqueiro',
          email: profile.email,
          role: profile.role,
          status: profile.status,
          profile_completed: profile.profile_completed,
          username: profile.username || '',
          avatar_url: profile.avatar_url,
          admin_mercado: profile.admin_mercado || false,
          admin_social: profile.admin_social || false,
          admin_eventos: profile.admin_eventos || false,
          admin_noticias: profile.admin_noticias || false,
          isMaster: MASTER_EMAILS.includes(profile.email?.toLowerCase()),
          bio: profile.bio
        } as any;
        
        setUser(mappedUser);
        saveCachedProfile(mappedUser);

        const lastAcceptance = profile.user_legal_acceptances?.[0];
        const { value: localConsent } = await Preferences.get({ key: `arena_legal_accepted_${userId}` });
        const hasValidConsent = !!(lastAcceptance && 
                                lastAcceptance.terms_version === TERMS_VERSION && 
                                lastAcceptance.privacy_version === PRIVACY_VERSION) ||
                                localConsent === `${TERMS_VERSION}_${PRIVACY_VERSION}`;

        
        hasValidConsentRef.current = hasValidConsent;

        const isEstablished = !!profile.profile_completed;
        const activeView = currentViewRef.current;
        const onboardingViews = [View.LOGIN, View.SIGNUP, View.COMPLETE_PROFILE, View.LEGAL_CONSENT];

        if (!isEstablished) {
          setCurrentView(View.COMPLETE_PROFILE);
        } else if (!hasValidConsent) {
          setCurrentView(View.LEGAL_CONSENT);
        } else {
          if (onboardingViews.includes(activeView)) {
            const { value: savedView } = await Preferences.get({ key: 'arena_last_view' });
            const navData = await getCachedNavData();
            
            if (savedView) {
              setCurrentView(savedView as View);
              if (navData.store) setSelectedStore(navData.store);
              if (navData.event) setSelectedEvent(navData.event);
            } else {
              setCurrentView(View.EVENTS);
            }
          }
        }
      }
    } catch (err) {
      console.error('Fetch Profile Error:', err);
    } finally {
      if (isMountedRef.current) {
        isFetchingProfile.current = false;
        setInitializing(false);
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;

    const startup = async () => {
      // Se já inicializou, não faz nada (previne loops no multitarefa se o App re-renderizar)
      if (isInitializedRef.current) return;
      
      try {
        // Inicializar Google Auth globalmente no mobile
        if (Capacitor.isNativePlatform()) {
          GoogleAuth.initialize({
            clientId: '833804814174-iqpspdjar3kj5qsadmug4if3mu90m6sm.apps.googleusercontent.com',
            scopes: ['profile', 'email'],
            grantOfflineAccess: true,
          }).catch(e => console.warn('GoogleAuth init warning:', e));
        }

        // RESILIÊNCIA WEB: Se estivermos vindo de um login Google na Web (?code=)
        // aguarda um breve momento para o sistema processar o token.
        if (!Capacitor.isNativePlatform() && (window.location.hash || window.location.search.includes('code='))) {
          await new Promise(r => setTimeout(r, 1000));
        }

        // Tentar hidratar do cache primeiro para dar feedback instantâneo

        const cached = await getCachedProfile();
        if (cached && isMountedRef.current) {
          setUser(cached);
          // Se o perfil parece completo, já liberamos a view
          if (cached.profile_completed && !initializing) {
             // Mantemos initializing true inicialmente para garantir splash, mas se cache existe, soltamos logo após getSession
          }
        }

        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // Já temos o usuário em cache? Ótimo, solta o loading logo.
          // O fetchProfile fará a atualização real em background.
          if (cached && cached.id === session.user.id) {
            setInitializing(false);
            fetchProfile(session.user.id, session.user);
          } else {
            // Se não tem cache ou é outro usuário, busca obrigatório antes de soltar splash
            await fetchProfile(session.user.id, session.user);
          }
        } else {
          setCurrentView(View.LOGIN);
          setInitializing(false);
        }
      } catch (err) {
        console.error('Init Error:', err);
        setInitializing(false); // Garante saída do splash em erro
      } finally {
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

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F0A05] relative overflow-hidden">
        {/* Background do Cavalo */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-[#0F0A05] z-10" />
          <img
            src="https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
            className="w-full h-full object-cover scale-110 animate-pulse duration-[10000ms]"
            alt="Vaquejada Background"
          />
        </div>
        
        <div className="flex flex-col items-center gap-8 relative z-10 transition-all duration-1000 text-center">
          <div className="w-16 h-16 border-4 border-[#ECA413]/30 border-t-[#ECA413] rounded-full animate-spin" />
          
          <div className="animate-in fade-in slide-in-from-top-10 duration-1000">
            <div className="flex justify-center mb-4">
              <p className="font-black tracking-tighter italic leading-none flex items-baseline">
                <span className="text-[#ECA413]" style={{ fontSize: '4rem', lineHeight: 1, marginRight: '-0.1em' }}>+V</span>
                <span className="text-white text-[2.5rem] tracking-tight">AQUEJADA</span>
              </p>
            </div>
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest italic">A maior paixão do Nordeste em um só lugar</p>
          </div>
        </div>
      </div>
    );
  }

  return (
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
  );
};

export default App;
