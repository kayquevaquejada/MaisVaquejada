
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
import { NativeBiometric } from '@capgo/capacitor-native-biometric';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(() => {
    const savedView = sessionStorage.getItem('arena_last_view');
    return (savedView as View) || View.EVENTS;
  });
  const [profileUsername, setProfileUsername] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  
  const MASTER_EMAILS = [
    'kayquegusmao@icloud.com',
    'kayquegusmao276@gmail.com',
    'Kayquegusmao1@gmail.com',
    'drkayquegusmao@gmail.com'
  ];
  const [initializing, setInitializing] = useState(true);
  const [isBiometricLocked, setIsBiometricLocked] = useState(false);

  useEffect(() => {
    // Consolidated Init Logic
    const initApp = async () => {
      try {
        console.log('DEBUG: Current Browser URL:', window.location.href);
        console.log('DEBUG: Supabase Client Config:', (supabase as any).supabaseUrl);
        
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('App Init: Session found:', !!session, 'Error:', error);
        
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          // Handle Paths if no session
          const path = window.location.pathname;
          if (path.startsWith('/perfil/')) {
              setCurrentView(View.LOGIN); // Must login to see others? Or just go to login
          } else if (![View.LOGIN, View.SIGNUP, View.FORGOT_PASSWORD, View.RECOVERY_ASSISTED].includes(currentView)) {
              setCurrentView(View.LOGIN);
          }
          setInitializing(false);
        }
      } catch (err) {
        console.error('CRITICAL: Error in initApp:', err);
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

      // Add to history
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
            // Fallback parsing
            const path = window.location.pathname;
            if (path.startsWith('/perfil/')) {
                const parts = path.split('/perfil/');
                setProfileUsername(parts[1] || null);
                setCurrentView(View.PROFILE);
            } else if (path === '/perfil' || path === '/meu-perfil') {
                setProfileUsername(null);
                setCurrentView(View.PROFILE);
            } else {
                setCurrentView(View.SOCIAL); // default fallback
            }
        }
    };

    window.addEventListener('arena_navigate', handleNav);
    window.addEventListener('popstate', handlePopState);
    
    // Also handle initial load path and save initial state
    const path = window.location.pathname;
    let initialView = currentView;
    let initialUser = null;

    if (path.startsWith('/perfil/')) {
        const parts = path.split('/perfil/');
        if (parts[1]) {
            initialUser = parts[1];
            initialView = View.PROFILE;
        }
    } else if (path === '/perfil' || path === '/meu-perfil') {
        initialUser = null;
        initialView = View.PROFILE;
    }
    
    setProfileUsername(initialUser);
    setCurrentView(initialView);
    // CRITICAL: Preserve full URL search params and hash (needed for Supabase Auth redirect)
    const currentFullURL = window.location.pathname + window.location.search + window.location.hash;
    
    setProfileUsername(initialUser);
    setCurrentView(initialView);
    window.history.replaceState({ view: initialView, username: initialUser }, '', currentFullURL);

    return () => {
        window.removeEventListener('arena_navigate', handleNav);
        window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  useEffect(() => {
    if (currentView !== View.LOGIN && currentView !== View.SIGNUP && currentView !== View.FORGOT_PASSWORD && currentView !== View.COMPLETE_PROFILE) {
      sessionStorage.setItem('arena_last_view', currentView);
    }
  }, [currentView]);

  // Request all necessary permissions (Push, GPS, Camera, Mic) across iPad, Mac, Mobile
  useEffect(() => {
    const requestDevicePermissions = async () => {
      if (!user) return;
      
      // Biometric lock check
      try {
        const bioResult = await NativeBiometric.isAvailable();
        if (bioResult.isAvailable) {
          setIsBiometricLocked(true);
          await NativeBiometric.verifyIdentity({
            reason: "Para proteger os seus dados, use sua biometria",
            title: "Acesso Seguro +Vaquejada",
            subtitle: "Identificação Exigida",
            description: "Desbloqueie o App usando seu rosto ou dedo"
          }).then(() => {
            setIsBiometricLocked(false);
          }).catch((err) => {
            console.error("Falha na autenticação biométrica:", err);
            // If they cancel, it remains locked
          });
        }
      } catch (e) {
        console.log("Biometria não suportada ou não é app nativo:", e);
      }

      try {
        // Notificações Push
        if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission();
        }
        // Localização / GPS
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(() => {}, () => {});
        }
        // Câmera & Microfone
        const mediaPerm = localStorage.getItem('arena_media_perm_requested');
        if (!mediaPerm && navigator.mediaDevices) {
          await navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
              // Immediately stop tracks so we don't leave camera on
              stream.getTracks().forEach(track => track.stop());
          });
          localStorage.setItem('arena_media_perm_requested', 'true');
        }
      } catch (err) {
        console.log('Permissões negadas ou em ambiente restrito:', err);
        localStorage.setItem('arena_media_perm_requested', 'true');
      }
    };
    
    // Dispara 2.5s após o login para a UI principal carregar antes
    if (user) {
       setTimeout(requestDevicePermissions, 2500);
    }
  }, [user]);

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

      // Auto-create profile if missing
      if (!profile && !error && authUser) {
        console.log('Profile not found, attempting to auto-create...');
        const isMaster = authUser.email && MASTER_EMAILS.some(e => e.toLowerCase() === authUser.email?.toLowerCase());

        const newProfile = {
          id: authUser.id,
          full_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || 'Vaqueiro',
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
        } else {
          console.error('Error creating profile:', createError);
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

        // Redirect logic: All NEW users go to registration once
        if (!mappedUser.profile_completed) {
          setCurrentView(View.COMPLETE_PROFILE);
        } else {
          const savedView = sessionStorage.getItem('arena_last_view');
          setCurrentView((savedView as View) || View.EVENTS);
        }
      } else if (authUser) {
        // Ultimate fallback to prevent "Profile Not Found" loop
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
    // Rely on fetchProfile via onAuthStateChange
    setInitializing(true);
    if (userData?.id) {
      fetchProfile(userData.id);
    }
  };

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-dark">
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6"></div>
          <p className="text-primary font-black text-2xl animate-pulse tracking-tighter italic">+VAQUEJADA</p>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    sessionStorage.removeItem('arena_last_view');
    setCurrentView(View.LOGIN);
  };

  const renderView = () => {
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
        return <EventsView />;
      case View.SOCIAL:
        return <SocialFeedView user={user} onMediaCreation={() => setCurrentView(View.MEDIA_CREATION)} />;
      case View.MERCADO:
        return <MarketView />;
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
          />
        );
      case View.FORGOT_PASSWORD:
        return <ForgotPasswordView onBack={() => setCurrentView(View.LOGIN)} />;
      default:
        return <EventsView />;
    }
  };

  const showNavbar = ![View.LOGIN, View.SIGNUP, View.FORGOT_PASSWORD, View.COMPLETE_PROFILE, View.BLOCKED_ACCOUNT, View.RECOVERY_ASSISTED].includes(currentView);

  if (isBiometricLocked) {
    return (
      <div className="min-h-screen flex flex-col pt-32 px-6 items-center bg-background-dark font-display">
         <span className="material-icons text-8xl text-[#ECA413] drop-shadow-[0_0_15px_rgba(236,164,19,0.5)] mb-8">lock</span>
         <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter text-center">App Bloqueado</h1>
         <p className="text-white/60 text-center mt-2 text-sm max-w-[250px]">
           Por segurança, a biometria é necessária para usar o +Vaquejada nesta sessão.
         </p>
         <button 
           onClick={async () => {
             try {
                await NativeBiometric.verifyIdentity({
                  reason: "Para proteger os seus dados, use sua biometria",
                  title: "Acesso Seguro +Vaquejada",
                  subtitle: "Identificação Exigida",
                  description: "Desbloqueie o App usando seu rosto ou dedo"
                });
                setIsBiometricLocked(false);
             } catch(err) {
                console.log('Biometria falhou novamente');
             }
           }}
           className="mt-12 bg-[#ECA413] text-black font-black uppercase tracking-widest px-8 py-4 rounded-xl shadow-[0_0_20px_rgba(236,164,19,0.3)] active:scale-95 transition-transform"
         >
           Desbloquear
         </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-background-dark overflow-hidden">
      {/* App Container */}
      <div className="relative w-full h-screen bg-background-dark overflow-hidden flex flex-col">
        
        {/* View Content */}
        <div className="flex-1 overflow-y-auto hide-scrollbar relative">
          <div className="max-w-7xl mx-auto w-full h-full">
            {renderView()}
          </div>
        </div>

        {/* Bottom Navigation */}
        {showNavbar && (
          <Navbar currentView={currentView} onViewChange={setCurrentView} user={user} />
        )}
      </div>
    </div>
  );
};

export default App;
