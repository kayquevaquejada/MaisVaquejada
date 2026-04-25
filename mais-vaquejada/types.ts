export enum View {
  LOGIN = 'LOGIN',
  SIGNUP = 'SIGNUP',
  NEWS = 'NEWS',
  EVENTS = 'EVENTS',
  SOCIAL = 'SOCIAL',
  PROFILE = 'PROFILE',
  MERCADO = 'MERCADO',
  ADMIN = 'ADMIN',
  MEDIA_CREATION = 'MEDIA_CREATION',
  SETTINGS = 'SETTINGS',
  FORGOT_PASSWORD = 'FORGOT_PASSWORD',
  COMPLETE_PROFILE = 'COMPLETE_PROFILE',
  ADMIN_USERS = 'ADMIN_USERS',
  BLOCKED_ACCOUNT = 'BLOCKED_ACCOUNT',
  RECOVERY_ASSISTED = 'RECOVERY_ASSISTED',
  AD_CREATION = 'AD_CREATION',
  INTERNAL_ADS = 'INTERNAL_ADS',
  TERMS = 'TERMS',
  EVENT_DETAILS = 'EVENT_DETAILS',
  LEGAL_CONSENT = 'LEGAL_CONSENT',
  STORE_DETAILS = 'STORE_DETAILS',
  RESULT_DETAIL = 'RESULT_DETAIL'
}

export type ResultStatus = 'rascunho' | 'publicado' | 'arquivado';

export interface ResultItem {
  id: string;
  evento_id: string;
  titulo: string;
  descricao?: string;
  capa_url?: string;
  status: ResultStatus;
  parque_id?: string;
  circuito_id?: string;
  usuario_id?: string;
  publicado_em?: string;
  created_at?: string;
  updated_at?: string;
  // Campos para UI
  event_title?: string;
  event_park?: string;
  event_location?: string;
}

export interface ResultCategory {
  id: string;
  resultado_id: string;
  nome_categoria: string;
  ordem: number;
}

export interface ResultLine {
  id: string;
  resultado_id: string;
  categoria_id: string;
  etapa?: string;
  colocacao?: string;
  nome_competidor?: string;
  nome_equipe?: string;
  vaqueiro_1?: string;
  vaqueiro_2?: string;
  cavalo?: string;
  cidade?: string;
  tempo?: string;
  pontos?: string;
  premiacao?: string;
  observacao?: string;
  usuario_vinculado_id?: string;
  ordem: number;
}

export type UserType = 'common' | 'seller' | 'organizer' | 'admin';

export interface Circuito {
  id: string;
  nome: string;
  slug: string;
  descricao?: string;
  ativo: boolean;
  destaque?: boolean;
  ordem: number;
  imagemCapa?: string | null;
  corEtiqueta?: string | null;
}

export type UserPermission = 'announce' | 'organize_event';
export type TrustLevel = 'normal' | 'monitored' | 'restricted';

export interface User {
  id: string;
  name: string;
  full_name?: string;
  display_name?: string;
  email: string;
  phone: string;
  state_id: string;
  state_name?: string;
  city_id: string;
  city_name?: string;
  type: UserType;
  role: 'USER' | 'ADMIN' | 'ADMIN_LOCAL' | 'ADMIN_MASTER';
  status: 'PENDING_PROFILE' | 'ACTIVE' | 'BLOCKED' | 'INACTIVE';
  profile_completed: boolean;
  is_verified: boolean;
  can_add_vaquejada: boolean;
  signup_provider?: 'google' | 'email';
  google_email?: string;
  permissions: UserPermission[];
  trustLevel: TrustLevel;
  blocked: boolean;
  username?: string;
  avatar_url?: string;
  isMaster?: boolean;
  admin_mercado?: boolean;
  admin_social?: boolean;
  admin_eventos?: boolean;
  admin_noticias?: boolean;
  bio?: string;
  legal_acceptance_completed?: boolean;
  last_legal_accepted_at?: string;
  last_terms_version?: string;
  last_privacy_version?: string;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
  stats?: {
    adsCount: number;
    eventsCount: number;
    complaintsReceived: number;
  };
}

export type AdStatus = 'active' | 'paused' | 'blocked' | 'sold';

export interface Advertisement {
  id: string;
  title: string;
  price: string;
  imageUrl: string;
  category: string;
  location: string;
  userId: string;
  status: AdStatus;
  isSponsored: boolean;
  isPinned: boolean;
  createdAt: string;
  views: number;
  complaints?: number;
}

export type ComplaintReason = 'spam' | 'inappropriate' | 'fraud' | 'other';
export type ComplaintStatus = 'pending' | 'resolved' | 'ignored';

export interface Complaint {
  id: string;
  targetId: string; // ID of Ad, Event, or User
  targetType: 'ad' | 'event' | 'user' | 'post';
  reporterId: string;
  reason: ComplaintReason;
  description?: string;
  status: ComplaintStatus;
  createdAt: string;
}

export type CommunicationPriority = 'normal' | 'important' | 'urgent';

export interface Communication {
  id: string;
  title: string;
  content: string;
  priority: CommunicationPriority;
  isPinned: boolean;
  scheduledFor?: string;
  createdAt: string;
  active: boolean;
}

export interface Sponsor {
  id: string;
  name: string;
  logoUrl: string;
  externalLink?: string;
  placement: ('home' | 'market' | 'events' | 'arena')[];
  active: boolean;
  isMaster: boolean;
  startDate: string;
  endDate?: string;
}

export interface AdminStats {
  totalUsers: number;
  activeEvents: number;
  activeAds: number;
  pendingComplaints: number;
  activeCommunications: number;
  activeSponsors: number;
  revenue: string;
}

export interface NewsItem {
  id: string;
  tag: string;
  title: string;
  description: string;
  date: string;
  type: 'urgent' | 'official' | 'info';
}

export interface EventItem {
  id: string;
  title: string;
  location: string;
  park: string;
  price: string;
  category: string;
  date: {
    month: string;
    day: string;
  };
  imageUrl: string; // Legacy
  image_url?: string; // New
  images?: string[]; // Legacy
  galeria_urls?: string[]; // New
  site?: string;
  instagram?: string;
  phone?: string;
  whatsapp?: string;
  prizes?: string;
  description?: string;
  isHighlight?: boolean; // Legacy
  is_highlight?: boolean; // New
  isPaused?: boolean; // Legacy
  is_paused?: boolean; // New
  latitude?: number;
  longitude?: number;
  endereco?: string;
  status?: 'em_breve' | 'confirmado' | 'acontecendo' | 'encerrado';
  valor_inscricao?: string;
  valor_ingresso?: string;
  horario_inicio?: string;
  horario_fim?: string;
  organizador_id?: string;
  circuitoId?: string | null;
}

export interface PostItem {
  id: string;
  userId: string;
  username: string;
  isVerified: boolean;
  location: string;
  imageUrl: string;
  likes: number | string;
  comments: number;
  caption: string;
  hashtags: string[];
  timeAgo: string;
  isFeature?: boolean;
  views?: string;
  isShadowbanned?: boolean;
  lat?: number;
  lng?: number;
  aspect_ratio?: 'original' | '1:1' | '4:5' | '16:9';
  zoom?: number;
  offset_x?: number;
  offset_y?: number;
}

export interface PostLike {
  id: string;
  postId: string;
  userId: string;
}

export interface PostFavorite {
  id: string;
  postId: string;
  userId: string;
}

export interface PostComment {
  id: string;
  postId: string;
  userId: string;
  username: string;
  text: string;
  createdAt: string;
}

export interface StoryItem {
  id: string;
  username: string;
  imageUrl: string; // Avatar
  mediaUrl?: string; // Content
  mediaType?: 'image' | 'video';
  hasNew?: boolean;
}

export interface Transmission {
  id: string;
  title: string;
  youtube_url: string;
  thumbnail_url?: string;
  is_live: boolean;
  active: boolean;
  created_at: string;
}
