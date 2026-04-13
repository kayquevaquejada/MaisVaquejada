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

const MASTER_EMAILS = ["kayquegusmao@icloud.com", "kayquegusmao276@gmail.com", "Kayquegusmao1@gmail.com", "drkayquegusmao@gmail.com", "contato@maisvaquejada.com.br"];

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

  useEffect(() => {
    currentViewRef.current = currentView;
  }, [currentView]);

  const fetchProfile = async (userId: string, authUser?: any) => {
    if (isFetchingProfile.current) return;
    isFetchingProfile.current = true;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profile) {
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

        const isEstablished = profile.profile_completed || (profile.username && profile.username.length >= 2);
        const activeView = currentViewRef.current;
        const onboardingViews = [View.LOGIN, View.SIGNUP, View.COMPLETE_PROFILE];

        if (isEstablished) {
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
      if (isMounted) {
        isFetchingProfile.current = false;
        setInitializing(false);
      }
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    // Safety Timeout: Força o desligamento do loading em no máximo 6 segundos
    const fallbackTimeout = setTimeout(() => {
      if (isMounted && initializing) {
        console.warn('Initialization taking too long, forcing unlock...');
        setInitializing(false);
      }
    }, 6000);

    async function init() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (!isMounted) return;

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
        if (isMounted) setInitializing(false);
      }
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

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
      isMounted = false;
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

  const showNavbar = ![View.LOGIN, View.SIGNUP, View.FORGOT_PASSWORD, View.COMPLETE_PROFILE, View.BLOCKED_ACCOUNT, View.RECOVERY_ASSISTED, View.AD_CREATION].includes(currentView);

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F0A05] relative overflow-hidden">
        {/* Efeito de brilho de fundo */}
        <div className="absolute w-[500px] h-[500px] bg-[#ECA413]/5 rounded-full blur-[120px] animate-pulse" />
        
        <div className="flex flex-col items-center gap-8 relative z-10 transition-all duration-1000">
          <div className="relative">
            {/* Logo com animação de pulsação */}
            <img 
              src="/logo.png" 
              className="w-32 h-32 object-contain animate-pulse drop-shadow-[0_0_30px_rgba(236,164,19,0.3)]" 
              alt="Logo Arena"
            />
            {/* Spinner sutil em volta do logo */}
            <div className="absolute -inset-4 border-2 border-[#ECA413]/10 border-t-[#ECA413]/40 rounded-full animate-spin duration-1000" />
          </div>

          <div className="flex flex-col items-center gap-2">
            <h2 className="text-[#ECA413] font-black italic text-3xl tracking-[-0.05em] uppercase drop-shadow-md">
              VAQUERAMA
            </h2>
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div 
                  key={i} 
                  className="w-1.5 h-1.5 bg-[#ECA413] rounded-full animate-bounce" 
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
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
