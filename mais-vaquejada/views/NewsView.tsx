import React from 'react';
import { NewsItem, User } from '../types';
import { supabase } from '../lib/supabase';

const TABS = ['TUDO', 'EVENTOS', 'REGULAMENTO', 'NOTÍCIAS'];

interface NewsViewProps {
    user?: User | null;
}

// Extrai o ID do vídeo YouTube de uma URL
function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

const NewsView: React.FC<NewsViewProps> = ({ user }) => {
  const [localNews, setLocalNews] = React.useState<any[]>([]);
  const [activeTab, setActiveTab] = React.useState('TUDO');
  const [selectedNews, setSelectedNews] = React.useState<any | null>(null);
  const [transmissions, setTransmissions] = React.useState<any[]>([]);
  const [isTvOpen, setIsTvOpen] = React.useState(false);
  const [selectedTransmission, setSelectedTransmission] = React.useState<any | null>(null);
  const [hasLive, setHasLive] = React.useState(false);

  // Busca transmissões ativas
  React.useEffect(() => {
    const fetchTransmissions = async () => {
      const { data } = await supabase
        .from('transmissions')
        .select('*')
        .eq('active', true)
        .order('is_live', { ascending: false })
        .order('created_at', { ascending: false });
      if (data) {
        setTransmissions(data);
        setHasLive(data.some(t => t.is_live));
      }
    };
    fetchTransmissions();
    // Recarrega a cada 60 segundos para capturar novas lives
    const interval = setInterval(fetchTransmissions, 60000);
    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    const fetchNews = async () => {
      const { data } = await supabase
        .from('news')
        .select('*')
        .eq('is_paused', false)
        .order('created_at', { ascending: false });
      if (data) setLocalNews(data);
    };
    fetchNews();
  }, []);

  const filteredNews = React.useMemo(() => {
    if (activeTab === 'TUDO') return localNews;
    if (activeTab === 'EVENTOS') return localNews.filter(n => n.tag === 'EVENTO' || n.title.includes('EVENTO'));
    if (activeTab === 'REGULAMENTO') return localNews.filter(n => n.title.includes('REGULAMENTO'));
    return localNews.filter(n => n.type === 'official' && !n.title.includes('REGULAMENTO') && n.tag !== 'EVENTO');
  }, [activeTab, localNews]);

  // ---- LEITURA DE NOTÍCIA ----
  if (selectedNews) {
    return (
      <div className="min-h-[100vh] bg-[#F5F1E9] p-6 pb-48 animate-in slide-in-from-right duration-300 relative z-[50] -m-6 rounded-xl">
        <header className="flex justify-between items-center mb-8 pt-6">
          <button onClick={() => setSelectedNews(null)} className="w-10 h-10 rounded-full bg-[#1A1108]/10 flex items-center justify-center border border-[#1A1108]/20 active:scale-95 transition-transform">
            <span className="material-icons text-[#1A1108]">arrow_back</span>
          </button>
        </header>

        <article className="max-w-xl mx-auto">
          <div className="mb-6 flex items-center justify-between">
            <span className="bg-[#ECA413] text-white text-[10px] font-black px-3 py-1.5 rounded flex items-center gap-1 shadow-md shadow-[#ECA413]/20">
              <span className="material-icons text-[12px]">verified</span> {selectedNews.tag}
            </span>
            <span className="text-xs text-[#1A1108]/60 font-bold">{selectedNews.date}</span>
          </div>

          <h1 className="text-4xl font-black text-[#1A1108] uppercase leading-none font-display mb-6">{selectedNews.title}</h1>
          <div className="w-12 h-1 bg-[#ECA413] mb-8 rounded-full"></div>

          <div className="w-full text-[#1A1108]/80 font-medium leading-relaxed text-base space-y-6">
            <p>{selectedNews.description}</p>
            <p className="p-4 bg-white/80 border border-[#1A1108]/10 rounded-xl text-sm shadow-sm mt-8 text-[#1A1108]">
              <b className="text-[#1A1108]">Aviso Informativo:</b> Recomendamos sempre verificar fontes oficiais no portal web caso ainda haja dúvidas.
            </p>
          </div>

          {selectedNews.image_url && (
            <div className="mt-8 rounded-2xl overflow-hidden shadow-xl border border-[#1A1108]/10 bg-white">
              <img src={selectedNews.image_url} className="w-full h-auto object-cover" alt="Notícia Imagem" />
            </div>
          )}

          {selectedNews.pdf_url && (
            <div className="mt-12 bg-[#1A1108]/5 border border-[#1A1108]/10 rounded-2xl p-6">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1A1108]/40 mb-4">Documento Anexo</h4>
              <a href={selectedNews.pdf_url} target="_blank" rel="noopener noreferrer"
                className="w-full bg-white border border-[#1A1108]/10 p-4 rounded-xl flex items-center justify-between group active:scale-95 transition-transform shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center shrink-0">
                    <span className="material-icons text-red-500">picture_as_pdf</span>
                  </div>
                  <div className="text-left flex-1 min-w-0 pr-3 text-[#1A1108]">
                    <p className="text-sm font-bold truncate">Abrir PDF Oficial</p>
                    <p className="text-[10px] opacity-60 font-bold uppercase">Clique para visualizar</p>
                  </div>
                </div>
                <span className="material-icons text-[#1A1108]/20 group-hover:text-[#ECA413] transition-colors shrink-0">open_in_new</span>
              </a>
            </div>
          )}

          {selectedNews.external_link && (
            <div className="mt-6">
              <a href={selectedNews.external_link} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full p-4 bg-[#1A1108] text-white rounded-xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all shadow-xl"
              >
                <span className="material-icons text-sm">link</span> Saiba mais / Ver fonte
              </a>
            </div>
          )}
        </article>
      </div>
    );
  }

  // ---- LISTA PRINCIPAL ----
  return (
    <div className="pb-24">

      {/* ===== BOTÃO TV +VAQUEJADA — FIXO E EM DESTAQUE ===== */}
      <div className="sticky top-0 z-40 px-6 pt-4 pb-3 bg-background-dark/95 backdrop-blur-md border-b border-white/5">

        {/* Header principal */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <span className="material-icons text-primary-orange">campaign</span>
            <h1 className="text-3xl font-black uppercase text-primary font-display">+VAQUEJADA</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => alert('Buscando notícias...')} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 active:scale-95 transition-transform">
              <span className="material-icons text-xl">search</span>
            </button>
            <button onClick={() => alert('Abrindo painel de notificações...')} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 active:scale-95 transition-transform">
              <span className="material-icons text-xl">notifications</span>
            </button>
          </div>
        </div>

        {/* BOTÃO TV PRINCIPAL */}
        {console.log('Rendering NewsView, check TV button')}
        <button
          onClick={() => setIsTvOpen(true)}
          className="w-full flex items-center gap-4 bg-gradient-to-r from-red-700 via-red-600 to-red-700 rounded-2xl p-4 mb-3 shadow-2xl shadow-red-900/40 active:scale-[0.98] transition-all group relative overflow-hidden"
        >
          {/* Brilho animado */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0 shadow-inner">
            <span className="material-icons text-white text-2xl">live_tv</span>
          </div>

          <div className="flex-1 text-left">
            <div className="flex items-center gap-2">
              <p className="text-white font-black text-xl italic tracking-tighter leading-none">TV +VAQUEJADA</p>
              {hasLive && (
                <span className="flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  <span className="text-[9px] font-black text-white uppercase tracking-widest">AO VIVO</span>
                </span>
              )}
            </div>
            <p className="text-white/70 text-[11px] uppercase font-bold tracking-widest mt-1">
              {transmissions.length > 0 ? `${transmissions.length} transmiss${transmissions.length === 1 ? 'ão' : 'ões'} disponível` : 'Central de transmissões ao vivo'}
            </p>
          </div>

          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
            <span className="material-icons text-white text-lg">chevron_right</span>
          </div>
        </button>

        {/* Filtros de categorias */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-full font-bold text-xs whitespace-nowrap border-2 transition-all active:scale-95 ${activeTab === tab ? 'bg-primary-orange border-primary-orange text-white shadow-lg shadow-primary-orange/20' : 'border-white/10 text-white/40 hover:bg-white/5'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo das notícias */}
      <div className="px-6 pt-6 space-y-6">
        <div>
          <h2 className="text-4xl font-black text-primary-orange uppercase leading-none mb-1 font-display tracking-tight">ARENA NOTÍCIAS</h2>
          <p className="text-white/40 text-sm">O seu canal oficial de informações</p>
        </div>

        {filteredNews.length === 0 ? (
          <div className="text-center text-white/40 py-10 border border-white/10 border-dashed rounded-2xl">
            <span className="material-icons text-4xl mb-2 opacity-50">article</span>
            <p className="text-sm font-bold uppercase tracking-widest">Nenhuma notícia encontrada.</p>
          </div>
        ) : (
          filteredNews.map((item) => (
            <div key={item.id} className="bg-sand-light rounded-2xl overflow-hidden shadow-2xl border border-white/10 group active:scale-[0.98] transition-all">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <span className="bg-leather text-white text-[10px] font-black px-3 py-1 rounded flex items-center gap-1 shadow-sm">
                    <span className="material-icons text-[12px]">verified</span> {item.tag}
                  </span>
                  <span className="text-[10px] text-leather/60 font-bold">{item.date}</span>
                </div>
                <h3 className="text-2xl font-black text-leather mb-3 uppercase leading-tight font-display pr-4">{item.title}</h3>
                <p className="text-leather/80 text-sm leading-relaxed mb-6 font-medium line-clamp-3">{item.description}</p>

                <button
                  onClick={() => setSelectedNews(item)}
                  className="w-full bg-white hover:bg-leather text-leather hover:text-white border border-leather/20 font-black text-xs uppercase tracking-widest py-4 rounded-xl flex items-center justify-center gap-2 mb-4 transition-colors shadow-sm"
                >
                  <span className="material-icons text-sm">visibility</span>
                  LER NOTÍCIA
                </button>

                <div className="flex items-center justify-between border-t border-leather/10 pt-4">
                  <span className="text-[10px] font-black text-primary-orange uppercase tracking-widest">
                    {item.tag || 'INFORMATIVO'}
                  </span>
                  <button
                    className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity bg-leather/5 px-2 py-1 rounded"
                    onClick={() => setSelectedNews(item)}
                  >
                    <span className="material-icons text-leather/40 text-[14px]">attachment</span>
                    <span className="text-[9px] font-black text-leather/60">DETALHES</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}

        <div className="mt-12 text-center pb-12 opacity-20">
          <span className="material-icons text-6xl text-primary">shield</span>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] mt-2">Autenticidade Garantida</p>
        </div>
      </div>

      {/* ===== MODAL TV +VAQUEJADA FULL ===== */}
      {isTvOpen && (
        <div className="fixed inset-0 z-[200] flex flex-col bg-black animate-in fade-in duration-200">

          {/* Header do modal */}
          <div className="flex items-center justify-between px-5 py-4 bg-black border-b border-white/10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                <span className="material-icons text-white text-lg">live_tv</span>
              </div>
              <div>
                <h2 className="text-white font-black uppercase italic tracking-tighter text-lg leading-none">TV +VAQUEJADA</h2>
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Central de Transmissões</p>
              </div>
            </div>
            <button onClick={() => { setIsTvOpen(false); setSelectedTransmission(null); }} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center active:scale-90 transition-transform">
              <span className="material-icons text-white">close</span>
            </button>
          </div>

          {/* Player do YouTube (quando uma transmissão está selecionada) */}
          {selectedTransmission && (
            <div className="shrink-0 bg-black">
              <div className="relative aspect-video w-full">
                <iframe
                  src={`https://www.youtube.com/embed/${selectedTransmission.youtube_video_id || extractYouTubeId(selectedTransmission.youtube_url)}?autoplay=1&rel=0`}
                  className="w-full h-full"
                  allowFullScreen
                  allow="autoplay; encrypted-media"
                  title={selectedTransmission.title}
                />
              </div>
              {/* Info da transmissão selecionada */}
              <div className="px-5 py-3 bg-[#111] border-b border-white/10 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-white font-black text-sm uppercase leading-tight truncate">{selectedTransmission.title}</p>
                  <p className="text-white/40 text-[11px] font-bold mt-0.5">{selectedTransmission.channel_name}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {selectedTransmission.is_live && (
                    <span className="flex items-center gap-1 bg-red-600 px-2 py-1 rounded text-[9px] font-black text-white uppercase">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                      AO VIVO
                    </span>
                  )}
                  <a
                    href={selectedTransmission.youtube_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center"
                  >
                    <span className="material-icons text-white text-sm">open_in_new</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Lista de transmissões */}
          <div className="flex-1 overflow-y-auto">
            {transmissions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-50">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                  <span className="material-icons text-4xl text-white">signal_wifi_off</span>
                </div>
                <p className="text-white font-black uppercase text-lg italic tracking-tighter mb-2">Nenhuma transmissão</p>
                <p className="text-white/60 text-sm font-medium">Nenhuma transmissão ao vivo no momento. Aguarde os próximos eventos!</p>
              </div>
            ) : (
              <div className="p-5 space-y-4">
                {!selectedTransmission && (
                  <p className="text-white/40 text-[11px] font-bold uppercase tracking-widest mb-2">
                    {transmissions.filter(t => t.is_live).length > 0 ? '🔴 Ao Vivo agora' : 'Transmissões disponíveis'}
                  </p>
                )}

                {transmissions.map((t) => {
                  const videoId = t.youtube_video_id || extractYouTubeId(t.youtube_url);
                  const thumb = t.thumbnail_url || (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null);
                  const isSelected = selectedTransmission?.id === t.id;

                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTransmission(isSelected ? null : t)}
                      className={`w-full text-left rounded-2xl overflow-hidden border transition-all active:scale-[0.98] ${isSelected ? 'border-red-600 ring-2 ring-red-600/30' : 'border-white/10 bg-white/5'}`}
                    >
                      <div className="relative aspect-video bg-neutral-900">
                        {thumb ? (
                          <img src={thumb} className="w-full h-full object-cover" alt={t.title} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="material-icons text-5xl text-white/10">video_library</span>
                          </div>
                        )}

                        {/* Overlay play */}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl ${isSelected ? 'bg-red-600' : 'bg-black/60 border border-white/20'}`}>
                            <span className="material-icons text-white text-3xl translate-x-0.5">{isSelected ? 'pause' : 'play_arrow'}</span>
                          </div>
                        </div>

                        {/* Badge AO VIVO */}
                        {t.is_live && (
                          <div className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-lg animate-pulse">
                            <span className="w-1.5 h-1.5 bg-white rounded-full" />
                            AO VIVO
                          </div>
                        )}
                      </div>

                      <div className="px-4 py-3 bg-[#111] flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-black text-sm uppercase leading-tight truncate">{t.title}</p>
                          <p className="text-white/40 text-[11px] font-bold mt-0.5">{t.channel_name}</p>
                        </div>
                        <span className="material-icons text-red-600 shrink-0">{isSelected ? 'pause_circle' : 'play_circle'}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Info rodapé */}
            <div className="mx-5 mb-8 p-4 bg-red-600/10 border border-red-600/20 rounded-xl">
              <div className="flex items-start gap-3">
                <span className="material-icons text-red-500 shrink-0 mt-0.5">info</span>
                <p className="text-[11px] text-red-400 font-bold leading-relaxed">
                  Transmissões via YouTube. Toque em uma transmissão para assistir diretamente aqui no app, ou acesse pelo YouTube no ícone externo.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewsView;
