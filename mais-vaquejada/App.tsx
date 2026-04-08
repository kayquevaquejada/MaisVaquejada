
import React, { useState, useEffect } from 'react';
import { View, User } from './types';
import LoginView from './views/LoginView';
import SignUpView from './views/SignUpView';
import NewsView from './views/NewsView';
import EventsView from './views/EventsView';
import SocialFeedView from './views/SocialFeedView';
import MarketView from './views/MarketView';
import ProfileView from './views/ProfileView';
import AdminView from './views/AdminView';
import MediaCreationView from './views/MediaCreationView';
import SettingsView from './views/SettingsView';
import ForgotPasswordView from './views/ForgotPasswordView';
import CompleteProfileView from './views/CompleteProfileView';
import AdminUsersView from './views/AdminUsersView';
import BlockedAccountView from './views/BlockedAccountView';
import RecoveryAssistedView from './views/RecoveryAssistedView';
import Navbar from './components/Navbar';
import { supabase } from './lib/supabase';
import { requestPushPermission } from './lib/notifications';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.LOGIN);
  const [profileUsername, setProfileUsername] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  
  const MASTER_EMAILS = [
    'kayquegusmao@icloud.com',
    'kayquegusmao276@gmail.com',
    'Kayquegusmao1@gmail.com',
    'drkayquegusmao@gmail.com',
    'contato@maisvaquejada.com.br'
  ];
  const [initializing, setInitializing] = useState(true);
  const [isBiometricLocked, setIsBiometricLocked] = useState(false);

  useEffect(() => {
    const initApp = async () => {
      try {
        console.log('DEBUG: Current Browser URL:', window.location.href);
        
        const timeout = setTimeout(() => {
            setInitializing(false);
        }, 8000); // 8 seconds safety

        const params = new URLSearchParams(window.location.search);
        const eventId = params.get('event');
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          const path = window.location.pathname;
          if (eventId) {
              setCurrentView(View.EVENTS);
          } else if (path.startsWith('/perfil/')) {
              setCurrentView(View.LOGIN);
          } else if (![View.LOGIN, View.SIGNUP, View.FORGOT_PASSWORD, View.RECOVERY_ASSISTED, View.EVENTS].includes(currentView)) {
              setCurrentView(View.LOGIN);
          }
          setInitializing(false);
        }
        clearTimeout(timeout);
      } catch (err) {
        console.error('Init Error:', err);
        setInitializing(false);
        setCurrentView(View.LOGIN);
      }
    };

    initApp();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('App Auth Change:', event, !!session);
      if (session?.user) {
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          await fetchProfile(session.user.id);
        }
      } else {
        setUser(null);
        if (event === 'SIGNED_OUT') setCurrentView(View.LOGIN);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleNav = (e: any) => {
      const view = e.detail?.view || currentView;
      const username = e.detail?.username ?? null;
      
      setCurrentView(view);
      if (username !== undefined) {
          setProfileUsername(username);
      }

      const stateObj = { view, username };
      if (username) {
          window.history.pushState(stateObj, '', `/perfil/${username}`);
      } else if (view === View.PROFILE) {
          window.history.pushState(stateObj, '', `/perfil`);
      } else {
          window.history.pushState(stateObj, '', `/`);
      }
    };

    const handlePopState = (e: PopStateEvent) => {
        if (e.state) {
            setCurrentView(e.state.view);
            setProfileUsername(e.state.username);
        } else {
            const path = window.location.pathname;
            if (path.startsWith('/perfil/')) {
                const parts = path.split('/perfil/');
                setProfileUsername(parts[1] || null);
                setCurrentView(View.PROFILE);
            } else if (path === '/perfil' || path === '/meu-perfil') {
                setProfileUsername(null);
                setCurrentView(View.PROFILE);
            } else {
                setCurrentView(View.SOCIAL);
            }
        }
    };

    window.addEventListener('arena_navigate', handleNav);
    window.addEventListener('popstate', handlePopState);
    
    return () => {
        window.removeEventListener('arena_navigate', handleNav);
        window.removeEventListener('popstate', handlePopState);
    };
  }, [currentView]);

  useEffect(() => {
    if (currentView !== View.LOGIN && currentView !== View.SIGNUP && currentView !== View.FORGOT_PASSWORD && currentView !== View.COMPLETE_PROFILE) {
      sessionStorage.setItem('arena_last_view', currentView);
    }
  }, [currentView]);

  const fetchProfile = async (userId: string) => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const userEmail = authUser?.email;
      const isMasterEmail = userEmail && MASTER_EMAILS.some(e => e.toLowerCase() === userEmail.toLowerCase());

      let { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!profile && !error && authUser) {
        const isMaster = authUser.email && MASTER_EMAILS.some(e => e.toLowerCase() === authUser.email?.toLowerCase());

        const newProfile = {
          id: authUser.id,
          name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || 'Vaqueiro',
          display_name: authUser.user_metadata?.name || authUser.user_metadata?.full_name?.split(' ')[0] || 'Vaqueiro',
          email: authUser.email,
          role: isMaster ? 'ADMIN_MASTER' : 'USER',
          status: 'ACTIVE',
          profile_completed: false
        };
        
        const { data: created, error: createError } = await supabase
          .from('profiles')
          .insert([newProfile])
          .select()
          .single();
        
        if (!createError) {
          profile = created;
        }
      }

      if (profile) {
        const mappedUser: User = {
          id: profile.id,
          name: profile.full_name || profile.display_name || 'Vaqueiro',
          email: profile.email,
          role: profile.role || (isMasterEmail ? 'ADMIN_MASTER' : 'USER'),
          status: profile.status,
          profile_completed: profile.profile_completed,
          username: profile.username || (profile.full_name || 'user').toLowerCase().replace(/\s+/g, ''),
          avatar_url: profile.avatar_url,
          admin_mercado: profile.admin_mercado || false,
          admin_social: profile.admin_social || false,
          admin_eventos: profile.admin_eventos || false,
          admin_noticias: profile.admin_noticias || false,
          isMaster: isMasterEmail,
          bio: profile.bio
        } as any;
        
        setUser(mappedUser);

        if (!mappedUser.profile_completed) {
          setCurrentView(View.COMPLETE_PROFILE);
        } else {
          const savedView = sessionStorage.getItem('arena_last_view');
          setCurrentView((savedView as View) || View.EVENTS);
        }
      } else if (authUser) {
        setUser({
          id: userId,
          email: authUser.email || '',
          name: authUser.user_metadata?.full_name || 'Vaqueiro',
          role: isMasterEmail ? 'ADMIN_MASTER' : 'USER',
          status: 'ACTIVE',
          profile_completed: false
        } as any);
        setCurrentView(View.COMPLETE_PROFILE);
      }
    } catch (err: any) {
      console.error('CRITICAL: Error in fetchProfile:', err);
    } finally {
      setInitializing(false);
    }
  };

  const handleAuthSuccess = (userData: any) => {
    setInitializing(true);
    if (userData?.id) {
      fetchProfile(userData.id);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    sessionStorage.removeItem('arena_last_view');
    setCurrentView(View.LOGIN);
  };

  const renderView = () => {
    try {
      switch (currentView) {
        case View.LOGIN:
          return <LoginView onLogin={handleAuthSuccess} onSignUp={() => setCurrentView(View.SIGNUP)} onForgotPassword={() => setCurrentView(View.FORGOT_PASSWORD)} onRecoveryAssisted={() => setCurrentView(View.RECOVERY_ASSISTED)} />;
        case View.SIGNUP:
          return <SignUpView onBack={() => setCurrentView(View.LOGIN)} onSuccess={handleAuthSuccess} />;
        case View.COMPLETE_PROFILE:
          return <CompleteProfileView user={user} onComplete={() => user && fetchProfile(user.id)} onLogout={handleLogout} />;
        case View.ADMIN_USERS:
          return <AdminUsersView user={user} />;
        case View.BLOCKED_ACCOUNT:
          return <BlockedAccountView onLogout={handleLogout} />;
        case View.RECOVERY_ASSISTED:
          return <RecoveryAssistedView onBack={() => setCurrentView(View.LOGIN)} />;
        case View.NEWS:
          return <NewsView user={user} />;
        case View.EVENTS:
          const params = new URLSearchParams(window.location.search);
          return <EventsView publicEventId={params.get('event') || undefined} onLoginPrompt={() => setCurrentView(View.LOGIN)} />;
        case View.SOCIAL:
          return <SocialFeedView user={user} onMediaCreation={() => setCurrentView(View.MEDIA_CREATION)} />;
        case View.MERCADO:
          return <MarketView onViewChange={setCurrentView} />;
        case View.AD_CREATION:
          return <MarketView forceShowWizard={true} onViewChange={setCurrentView} onWizardClose={() => setCurrentView(View.MERCADO)} />;
        case View.PROFILE:
          return <ProfileView 
            user={user} 
            targetUsername={profileUsername} 
            onLogout={handleLogout} 
            onAdminView={() => setCurrentView(View.ADMIN)} 
            onSettingsView={() => setCurrentView(View.SETTINGS)} 
            onProfileUpdate={() => user && fetchProfile(user.id)}
          />;
        case View.ADMIN:
          return <AdminView user={user} />;
        case View.MEDIA_CREATION:
          return (
            <MediaCreationView
              user={user}
              onClose={() => setCurrentView(View.SOCIAL)}
              onSuccess={() => {
                setCurrentView(View.SOCIAL);
                alert('Publicado com sucesso!');
              }}
            />
          );
        case View.SETTINGS:
          return (
            <SettingsView
              user={user}
              onBack={() => setCurrentView(View.PROFILE)}
              onLogout={handleLogout}
              onProfileUpdate={() => user && fetchProfile(user.id)}
            />
          );
        case View.FORGOT_PASSWORD:
          return <ForgotPasswordView onBack={() => setCurrentView(View.LOGIN)} />;
        default:
          return <EventsView />;
      }
    } catch (e: any) {
      return (
        <div className="p-10 bg-white text-black">
          <h1>ERRO DE RENDERIZAÇÃO NA VIEW: {currentView}</h1>
          <pre>{e.stack || e.message}</pre>
        </div>
      );
    }
  };

  const showNavbar = ![View.LOGIN, View.SIGNUP, View.FORGOT_PASSWORD, View.COMPLETE_PROFILE, View.BLOCKED_ACCOUNT, View.RECOVERY_ASSISTED, View.AD_CREATION].includes(currentView) && !!user;

  if (initializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0F0A05] relative overflow-hidden">
        {/* Mesmo background do login */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-[#0F0A05] z-10" />
          <img
            src="https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
            className="w-full h-full object-cover scale-110"
            alt="Vaquejada Background"
          />
        </div>
        <div className="relative z-20 flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-4 border-[#ECA413]/30 border-t-[#ECA413] rounded-full animate-spin" />
          <p className="text-white font-black text-3xl tracking-tighter italic">
            +VAQUE<span className="text-[#ECA413]">JADA</span>
          </p>
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background-dark overflow-hidden">
      <div className="relative w-full h-screen bg-background-dark overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto hide-scrollbar relative">
          <div className="max-w-7xl mx-auto w-full h-full">
            {renderView()}
          </div>
        </div>
        {showNavbar && (
          <Navbar currentView={currentView} onViewChange={setCurrentView} user={user} />
        )}
      </div>
    </div>
  );
};

export default App;
