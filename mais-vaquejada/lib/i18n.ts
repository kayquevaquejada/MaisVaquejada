
import { useState, useEffect } from 'react';

export type Language = 'pt' | 'en' | 'es';

const translations = {
  pt: {
    settings: 'Configurações',
    editProfile: 'Editar Perfil',
    notifications: 'Notificações',
    privacy: 'Privacidade',
    security: 'Segurança',
    help: 'Ajuda',
    about: 'Sobre',
    language: 'Idioma',
    darkMode: 'Modo Escuro',
    dataUsage: 'Uso de Dados',
    logout: 'Sair da Conta',
    save: 'Salvar',
    cancel: 'Cancelar',
    confirmLanguageChange: 'Deseja mudar o idioma para ',
    confirm: 'Confirmar',
    loading: 'Carregando...',
    metrics: 'Métricas Globais',
    activity: 'Sua Atividade',
    blocked: 'Bloqueados',
    metrics_summary: 'Resumo Geral',
    metrics_users: 'Usuários Totais',
    metrics_events: 'Vaquejadas',
    metrics_news: 'Notícias App',
    metrics_market: 'Marketplace',
    metrics_posts: 'Postagens Core',
    metrics_banners: 'Anunciantes',
  },
  en: {
    settings: 'Settings',
    editProfile: 'Edit Profile',
    notifications: 'Notifications',
    privacy: 'Privacy',
    security: 'Security',
    help: 'Help',
    about: 'About',
    language: 'Language',
    darkMode: 'Dark Mode',
    dataUsage: 'Data Usage',
    logout: 'Logout',
    save: 'Save',
    cancel: 'Cancel',
    confirmLanguageChange: 'Do you want to change the language to ',
    confirm: 'Confirm',
    loading: 'Loading...',
    metrics: 'Global Metrics',
    activity: 'Your Activity',
    blocked: 'Blocked',
    metrics_summary: 'General Summary',
    metrics_users: 'Total Users',
    metrics_events: 'Events',
    metrics_news: 'App News',
    metrics_market: 'Marketplace',
    metrics_posts: 'Core Posts',
    metrics_banners: 'Advertisers',
  },
  es: {
    settings: 'Configuraciones',
    editProfile: 'Editar Perfil',
    notifications: 'Notificaciones',
    privacy: 'Privacidad',
    security: 'Seguridad',
    help: 'Ayuda',
    about: 'Acerca de',
    language: 'Idioma',
    darkMode: 'Modo Oscuro',
    dataUsage: 'Uso de datos',
    logout: 'Cerrar sesión',
    save: 'Guardar',
    cancel: 'Cancelar',
    confirmLanguageChange: '¿Desea cambiar el idioma a ',
    confirm: 'Confirmar',
    loading: 'Cargando...',
    metrics: 'Métricas Globales',
    activity: 'Tu Actividad',
    blocked: 'Bloqueados',
    metrics_summary: 'Resumen General',
    metrics_users: 'Usuarios Totales',
    metrics_events: 'Eventos',
    metrics_news: 'Noticias App',
    metrics_market: 'Marketplace',
    metrics_posts: 'Publicaciones Core',
    metrics_banners: 'Anunciantes',
  }
};

export const useI18n = () => {
  const [lang, setLang] = useState<Language>((localStorage.getItem('arena_lang') as Language) || 'pt');

  const t = (key: keyof typeof translations['pt']) => {
    return translations[lang][key] || translations['pt'][key];
  };

  const changeLanguage = (newLang: Language) => {
    localStorage.setItem('arena_lang', newLang);
    setLang(newLang);
    window.location.reload(); // Recarrega para aplicar em todo o app se necessário
  };

  return { t, lang, changeLanguage };
};
