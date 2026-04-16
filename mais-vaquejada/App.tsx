import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase';
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

const MASTER_EMAILS = ["kayquegusmao@icloud.com", "kayquegusmao276@gmail.com", "Kayquegusmao1@gmail.com", "maisvaquejada1@gmail.com", "contato@maisvaquejada.com.br"];

// ─── ViewRenderer definido FORA do App para evitar remontagem a cada render ───
interface ViewRendererProps {
  currentView: View;
  selectedEvent: any;
  user: User | null;
  profileUsername: string | null;
  onFetchProfile: (userId: string, authUser?: any) => Promise<void>;
  onSetCurrentView: (view: View) => void;
}

const ViewRenderer: React.FC<ViewRendererProps> = ({
  currentView,
  selectedEvent,
  user,
  profileUsername,
  onFetchProfile,
  onSetCurrentView,
}) => {
  switch (currentView) {
    case View.LOGIN:
      return <LoginView onLogin={(u) => onFetchProfile(u.id, u)} onSignUp={() => onSetCurrentView(View.SIGNUP)} onForgotPassword={() => onSetCurrentView(View.FORGOT_PASSWORD)} onRecoveryAssisted={() => onSetCurrentView(View.RECOVERY_ASSISTED)} onTerms={() => onSetCurrentView(View.TERMS)} />;
    case View.SIGNUP:
      return <SignUpView onBack={() => onSetCurrentView(View.LOGIN)} onSuccess={(u) => onFetchProfile(u.id, u)} />;
    case View.COMPLETE_PROFILE:
      return <CompleteProfileView user={user} onComplete={() => user && onFetchProfile(user.id)} onLogout={() => supabase.auth.signOut()} />;
    case View.SOCIAL:
      return <SocialFeedView user={user} onMediaCreation={() => onSetCurrentView(View.MEDIA_CREATION)} />;
    case View.EVENTS:
      return <EventsView onLoginPrompt={() => onSetCurrentView(View.LOGIN)} />;
    case View.NEWS:
      return <NewsView />;
    case View.MERCADO:
      return <MarketplaceView user={user} onViewChange={onSetCurrentView} />;
    case View.PROFILE:
      return <ProfileView user={user} targetUsername={profileUsername} onLogout={() => supabase.auth.signOut()} onAdminView={() => onSetCurrentView(View.ADMIN)} onSettingsView={() => onSetCurrentView(View.SETTINGS)} onProfileUpdate={() => user && onFetchProfile(user.id)} />;
    case View.MEDIA_CREATION:
      return <MediaCreationView user={user} onClose={() => onSetCurrentView(View.SOCIAL)} onSuccess={() => onSetCurrentView(View.SOCIAL)} />;
    case View.SETTINGS:
      return <SettingsView user={user} onBack={() => onSetCurrentView(View.PROFILE)} onLogout={() => supabase.auth.signOut()} onAdminView={() => onSetCurrentView(View.ADMIN)} onProfileUpdate={() => user && onFetchProfile(user.id)} />;
    case View.ADMIN:
      return <AdminView user={user} />;
    case View.ADMIN_USERS:
      return <AdminUsersView user={user} />;
    case View.INTERNAL_ADS:
      return <InternalAdManager user={user} onBack={() => onSetCurrentView(View.ADMIN)} />;
    case View.TERMS:
      return <EULAView onBack={() => onSetCurrentView(View.LOGIN)} />;
    case View.FORGOT_PASSWORD:
      return <ForgotPasswordView onBack={() => onSetCurrentView(View.LOGIN)} />;
    case View.BLOCKED_ACCOUNT:
      return <BlockedAccountView onLogout={() => supabase.auth.signOut()} />;
    case View.RECOVERY_ASSISTED:
      return <RecoveryAssistedView onBack={() => onSetCurrentView(View.LOGIN)} />;
    case View.EVENT_DETAILS:
      return <EventDetailView event={selectedEvent} onBack={() => onSetCurrentView(View.EVENTS)} />;
    case View.LEGAL_CONSENT:
      return <LegalConsentView user={user} onAccept={() => onFetchProfile(user?.id || '')} />;
    default:
      return <EventsView />;
  }
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.EVENTS);
  const [navKey, setNavKey] = useState(Date.now());
  const [profileUsername, setProfileUsername] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const isFetchingProfile = useRef(false);
  const currentViewRef = useRef(currentView);
  const isMountedRef = useRef(true);
  const hasValidConsentRef = useRef(false);

  useEffect(() => {
    currentViewRef.current = currentView;
  }, [currentView]);

  const fetchProfile = async (userId: string, authUser?: any) => {
    if (isFetchingProfile.current) return;
    isFetchingProfile.current = true;
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
        const profile = targetProfile; // Alias para manter compatibilidade com o código abaixo
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

        const lastAcceptance = profile.user_legal_acceptances?.[0];
        const hasValidConsent = !!(lastAcceptance && 
                               lastAcceptance.terms_version === TERMS_VERSION && 
                               lastAcceptance.privacy_version === PRIVACY_VERSION) ||
                               localStorage.getItem(`arena_legal_accepted_${userId}`) === `${TERMS_VERSION}_${PRIVACY_VERSION}`;
        
        hasValidConsentRef.current = hasValidConsent;

        const isEstablished = profile.profile_completed || (profile.username && profile.username.length >= 2);
        const activeView = currentViewRef.current;
        const onboardingViews = [View.LOGIN, View.SIGNUP, View.COMPLETE_PROFILE, View.LEGAL_CONSENT];

        if (!hasValidConsent) {
          if (![View.LOGIN, View.SIGNUP].includes(activeView)) {
            setCurrentView(View.LEGAL_CONSENT);
          }
        } else if (isEstablished) {
          if (onboardingViews.includes(activeView)) {
             const savedView = localStorage.getItem('arena_last_view');
             setCurrentView((savedView as View) || View.EVENTS);
          }
        } else if (!onboardingViews.includes(activeView)) {
          setCurrentView(View.COMPLETE_PROFILE);
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
    
    // Safety Timeout: Força o desligamento do loading em no máximo 10 segundos
    const fallbackTimeout = setTimeout(() => {
      async function forceUnlock() {
        if (isMountedRef.current && initializing) {
          console.warn('Initialization taking too long, forcing unlock...');
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            setInitializing(false);
            setCurrentView(View.LEGAL_CONSENT);
          } else {
            setInitializing(false);
            setCurrentView(View.LOGIN);
          }
        }
      }
      forceUnlock();
    }, 10000);

    async function init() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (!isMountedRef.current) return;

        if (sessionError) {
          console.error('Session Error:', sessionError);
          setInitializing(false);
          setCurrentView(View.LOGIN);
          return;
        }

        if (session?.user) {
          await fetchProfile(session.user.id, session.user);
        } else {
          setInitializing(false);
          setCurrentView(View.LOGIN);
        }
      } catch (err) {
        console.error('Init Error:', err);
        if (isMountedRef.current) setInitializing(false);
      }
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMountedRef.current) return;

      if (session?.user) {
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED') {
          await fetchProfile(session.user.id, session.user);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setCurrentView(View.LOGIN);
        setInitializing(false);
      }
    });

    return () => {
      isMountedRef.current = false;
      clearTimeout(fallbackTimeout);
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handleNav = (e: any) => {
      const view = e.detail?.view || currentView;
      const username = e.detail?.username ?? null;
      const eventData = e.detail?.event ?? null;

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

  const showNavbar = ![View.LOGIN, View.SIGNUP, View.FORGOT_PASSWORD, View.COMPLETE_PROFILE, View.BLOCKED_ACCOUNT, View.RECOVERY_ASSISTED, View.AD_CREATION, View.LEGAL_CONSENT].includes(currentView);

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
              user={user}
              profileUsername={profileUsername}
              onFetchProfile={fetchProfile}
              onSetCurrentView={setCurrentView}
            />
          </div>
        </div>
        {showNavbar && <Navbar currentView={currentView} user={user} />}
        <CallBar />
        <CallScreen />
      </div>
    </CallProvider>
  );
};

export default App;
