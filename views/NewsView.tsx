import React from 'react';
import { NewsItem, User, View } from '../types';
import { supabase } from '../lib/supabase';
import SponsorMarquee from '../components/SponsorMarquee';
import AdsCarousel from '../components/AdsCarousel';

const TABS = ['TUDO', 'EVENTOS', 'RESULTADOS', 'NOTÍCIAS'];

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

// Formata data para o padrão premium: "21 ABR 2026"
function formatDatePremium(dateStr: string): string {
  if (!dateStr) return '---';
  try {
    // Tenta lidar com formatos comuns (ISO, "DD de Mes de YYYY", etc)
    const normalized = dateStr.replace(/ de /gi, ' ');
    const d = new Date(normalized);
    if (isNaN(d.getTime())) return dateStr.toUpperCase();
    
    const day = d.getDate().toString().padStart(2, '0');
    const month = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase();
    const year = d.getFullYear();
    
    return `${day} ${month} ${year}`;
  } catch {
    return dateStr.toUpperCase();
  }
}

const NewsView: React.FC<NewsViewProps> = ({ user }) => {
  const [localNews, setLocalNews] = React.useState<any[]>([]);
  const [results, setResults] = React.useState<any[]>([]);
  const [activeTab, setActiveTab] = React.useState('NOTÍCIAS');
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
    const fetchResults = async () => {
      const { data } = await supabase
        .from('resultados')
        .select('*, events(title, park, location)')
        .in('status', ['publicado', 'rascunho'])
        .order('publicado_em', { ascending: false });
      if (data) setResults(data);
    };
    fetchNews();
    fetchResults();
  }, []);

  const filteredNews = React.useMemo(() => {
    const news = localNews || [];
    switch (activeTab) {
      case 'TUDO':
        return news;
      case 'EVENTOS':
        return news.filter(n => 
          n.tag?.toUpperCase() === 'EVENTO' || 
          n.title?.toUpperCase().includes('EVENTO') ||
          n.tag?.toUpperCase() === 'PROGRAMAÇÃO'
        );
      case 'REGULAMENTO':
        return news.filter(n => n.title?.toUpperCase().includes('REGULAMENTO') || n.tag?.toUpperCase() === 'REGULAMENTO');
      case 'NOTÍCIAS':
        return news.filter(n => 
          n.tag?.toUpperCase() !== 'EVENTO' && 
          n.tag?.toUpperCase() !== 'REGULAMENTO' &&
          !n.title?.toUpperCase().includes('REGULAMENTO') &&
          n.tag?.toUpperCase() !== 'PROGRAMAÇÃO'
        );
      case 'RESULTADOS':
        return [];
      default:
        return news;
    }
  }, [activeTab, localNews]);

  // ---- LEITURA DE NOTÍCIA ----
  if (selectedNews) {
    // Função auxiliar para quebrar texto em parágrafos, adicionar formatação premium e citações
    const renderContent = (text: string) => {
      if (!text) return null;
      let paragraphs = text.split('\n').filter(p => p.trim().length > 0);
      
      // Se for apenas um bloco, quebra por sentenças para leitura escaneável (evitar blocos de texto gigantes)
      if (paragraphs.length === 1) {
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
        paragraphs = [];
        let currentP = '';
        sentences.forEach((s, idx) => {
          currentP += s.trim() + ' ';
          if ((idx + 1) % 2 === 0 || idx === sentences.length - 1) {
            paragraphs.push(currentP.trim());
            currentP = '';
          }
        });
      }

      // Destacar números importantes
      const highlightRegex = /(R\$\s*[\d.,]+\s*(?:mil|milhões|milhão)?|[0-9]+(?:[.,][0-9]+)*(?:\s*(?:mil|milhões|milhão|km|anos|horas|dias|%))?)/gi;

      return paragraphs.map((charSeq, index) => {
        const isQuote = charSeq.startsWith('"') || charSeq.startsWith('“') || charSeq.startsWith('”');
        
        if (isQuote) {
          return (
            <blockquote key={index} className="pl-5 py-3 mb-8 border-l-[3px] border-[#ECA413] bg-[#F8F9FA] text-[#555] italic text-[17px] leading-relaxed rounded-r-xl">
              {charSeq}
            </blockquote>
          );
        }

        const parts = charSeq.split(highlightRegex);
        return (
          <p key={index} className="mb-6 leading-[1.7] text-[17px] text-[#444] font-normal tracking-[-0.01em]">
            {parts.map((p, i) => 
              highlightRegex.test(p) ? <strong key={i} className="text-[#111] font-bold">{p}</strong> : p
            )}
          </p>
        );
      });
    };

    return (
      <div className="min-h-screen bg-white animate-in fade-in duration-300 relative z-[50] pb-32">
        <header className="sticky top-0 z-[60] px-6 py-4 flex items-center justify-between bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
          <button onClick={() => setSelectedNews(null)} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 active:scale-95 transition-transform border border-gray-200/50">
            <span className="material-icons text-gray-800">arrow_back</span>
          </button>
          <div className="flex-1 text-center pr-10">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Leitura de Notícia</p>
          </div>
        </header>

        <article className="w-full max-w-3xl mx-auto px-6 py-8 sm:px-10">
          {/* TOPO: TAG e Data */}
          <div className="flex items-center justify-between mb-6">
            <span className="bg-gray-100 text-gray-700 text-[11px] font-black px-4 py-2 rounded-full uppercase tracking-widest border border-gray-200/50 shadow-sm">
              {selectedNews.tag || 'INFORMATIVO'}
            </span>
            <span className="text-[12px] text-gray-400 font-bold tracking-tight">
              {selectedNews.date}
            </span>
          </div>

          {/* TÍTULO */}
          <h1 className="text-[28px] sm:text-[42px] font-black text-gray-900 leading-[1.1] mb-6 tracking-[-0.03em] font-display animate-in fade-in slide-in-from-bottom-4 duration-500">
            {selectedNews.title}
          </h1>

          {/* LINHA DECORATIVA */}
          <div className="w-16 h-1.5 bg-[#ECA413] mb-8 rounded-full animate-in fade-in duration-500 delay-100"></div>

          {/* SUBTÍTULO / RESUMO OPCIONAL */}
          {selectedNews.subtitle && (
            <p className="text-[19px] text-gray-600 leading-relaxed mb-8 font-medium animate-in fade-in duration-500 delay-150">
              {selectedNews.subtitle}
            </p>
          )}

          {/* IMAGEM PRINCIPAL */}
          {selectedNews.image_url && (
            <div className="mb-12 w-full rounded-[32px] overflow-hidden relative border border-gray-100 shadow-2xl animate-in fade-in duration-700 delay-200">
              <img src={selectedNews.image_url} className="w-full h-auto object-cover" alt="Notícia Imagem" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
            </div>
          )}

          {/* CORPO DA NOTÍCIA */}
          <div className="animate-in fade-in duration-700 delay-300 max-w-prose mx-auto font-sans">
            <div className="news-body-content overflow-visible">
              {renderContent(selectedNews.description)}
            </div>

            {/* CARD AVISO INFORMATIVO (REFINADO) */}
            <div className="mt-16 bg-gray-50 p-6 rounded-[24px] border border-gray-100 flex items-start gap-4 shadow-sm">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center shrink-0 border border-blue-100/50">
                <span className="material-icons text-blue-500 text-[20px]">info_outline</span>
              </div>
              <div className="flex-1 pt-1">
                <h4 className="text-gray-900 font-black text-[14px] uppercase tracking-wide mb-1">Aviso Informativo</h4>
                <p className="text-gray-500 text-[13px] leading-relaxed font-medium">
                  Recomendamos sempre verificar fontes oficiais no portal web caso haja dúvidas sobre as informações acima.
                </p>
              </div>
            </div>

            {/* DOCUMENTO ANEXO */}
            {selectedNews.pdf_url && (
              <div className="mt-8 bg-white border border-gray-100 shadow-xl rounded-[28px] p-6">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-5">Documento Anexo</h4>
                <a href={selectedNews.pdf_url} target="_blank" rel="noopener noreferrer"
                  className="w-full bg-gray-50 border border-gray-200/50 p-5 rounded-[20px] flex items-center justify-between group active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center shrink-0 border border-red-100/50">
                      <span className="material-icons text-red-500 text-2xl">picture_as_pdf</span>
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <p className="text-[16px] font-black text-gray-900 truncate">PDF Oficial</p>
                      <p className="text-[12px] text-gray-400 font-bold mt-0.5">Toque para baixar ou ler</p>
                    </div>
                  </div>
                  <span className="material-icons text-gray-300 group-hover:text-[#ECA413] transition-colors">arrow_forward_ios</span>
                </a>
              </div>
            )}

            {/* LINK EXTERNO */}
            {selectedNews.external_link && (
              <div className="mt-8">
                <a href={selectedNews.external_link} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 w-full p-5 bg-gray-900 text-white rounded-[20px] font-black text-[13px] uppercase tracking-[0.1em] active:scale-[0.98] transition-transform shadow-xl shadow-black/10"
                >
                  <span className="material-icons text-[20px]">open_in_new</span> Saiba mais / Ver original
                </a>
              </div>
            )}
          </div>
        </article>

        <SponsorMarquee type="news_only" />
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
          className="w-full flex items-center gap-4 bg-gradient-to-r from-[#8B0000] via-[#C91A1A] to-[#FF3B3B] rounded-[24px] p-5 mb-4 shadow-[0_10px_30px_rgba(255,59,59,0.3)] active:scale-[0.98] transition-all group relative overflow-hidden"
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
        <div className="flex gap-2 overflow-x-auto hide-scrollbar bg-[#121212] p-1.5 rounded-full mt-2 mb-2">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 rounded-full font-black text-xs uppercase tracking-widest whitespace-nowrap transition-all duration-300 active:scale-95 ${activeTab === tab ? 'bg-[#D4AF37] text-black shadow-[0_4px_15px_rgba(212,175,55,0.4)]' : 'text-white/60 hover:text-white'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Painel de Propaganda (Banner Principal) */}
      <div className="-mx-0">
        <AdsCarousel key="news_top_ads" targetPosition="news_top_carousel" />
      </div>

      {/* Conteúdo das notícias */}
      <div className="px-6 pt-6 space-y-6">
        <div>
          <h2 className="flex items-center gap-2 text-[18px] font-black text-white uppercase leading-none mb-1 font-display tracking-wide">
            {activeTab === 'RESULTADOS' ? '🏆 RESULTADOS EM DESTAQUE' : '📰 NOTÍCIAS EM DESTAQUE'}
          </h2>
          <p className="text-white/40 text-[12px] font-medium">
            {activeTab === 'RESULTADOS' ? 'Acompanhe os resultados das competições' : 'As principais notícias do mundo da vaquejada'}
          </p>
        </div>

        {activeTab === 'RESULTADOS' ? (
          results.length === 0 ? (
            <div className="text-center text-white/40 py-20 border border-white/10 border-dashed rounded-[32px]">
              <span className="material-icons text-5xl mb-3 opacity-20">emoji_events</span>
              <p className="text-[10px] font-black uppercase tracking-[0.2em]">Nenhum resultado oficial disponível</p>
            </div>
          ) : (
            results.map((res) => (
              <div 
                key={res.id} 
                onClick={() => window.dispatchEvent(new CustomEvent('arena_navigate', { 
                  detail: { view: View.RESULT_DETAIL, resultId: res.id } 
                }))}
                className="bg-gradient-to-b from-[#1A1A1A] to-[#0A0A0A] rounded-[24px] overflow-hidden shadow-2xl border border-white/5 group active:scale-[0.98] transition-transform relative flex flex-col mb-4"
              >
                {/* Imagem de Capa */}
                <div className="h-[180px] w-full relative">
                  {res.capa_url ? (
                    <img src={res.capa_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={res.titulo} />
                  ) : (
                    <div className="w-full h-full bg-[#111] flex items-center justify-center">
                       <span className="material-icons text-white/10 text-6xl">emoji_events</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/40 to-transparent" />
                  
                  {/* Badge Status */}
                  <div className="absolute top-4 right-4">
                    <div className={`text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest shadow-lg ${res.status === 'publicado' ? 'bg-[#D4AF37] text-black shadow-[#D4AF37]/20' : 'bg-red-600 text-white shadow-red-600/30 animate-pulse'}`}>
                      {res.status === 'publicado' ? 'FINALIZADO' : 'AO VIVO'}
                    </div>
                  </div>
                </div>
                
                <div className="relative z-10 p-6 pt-0 -mt-8 flex flex-col gap-2">
                  <span className="text-white/40 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                    <span className="material-icons text-[12px]">calendar_today</span>
                    {res.publicado_em ? new Date(res.publicado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase() : 'AGUARDANDO'}
                  </span>

                  <h3 className="text-xl font-black text-white uppercase leading-tight mt-1">{res.titulo}</h3>
                  
                  <div className="flex items-center gap-1 mt-1 mb-4">
                    <span className="material-icons text-[#D4AF37] text-[14px]">place</span>
                    <p className="text-white/60 text-[11px] font-medium truncate">
                      {res.events?.park || 'Parque não informado'} • {res.events?.location?.split('-')[0]?.trim() || 'Brasil'}
                    </p>
                  </div>

                  <button className="w-full bg-[#D4AF37] text-black font-black text-[11px] uppercase tracking-widest py-3.5 rounded-xl flex items-center justify-center gap-2 mt-2 hover:bg-[#E2C355] transition-colors">
                    VER RESULTADOS <span className="material-icons text-[16px]">chevron_right</span>
                  </button>
                </div>
              </div>
            ))
          )
        ) : filteredNews.length === 0 ? (
          <div className="text-center text-white/40 py-20 border border-white/10 border-dashed rounded-[32px]">
            <span className="material-icons text-5xl mb-3 opacity-20">article</span>
            <p className="text-[10px] font-black uppercase tracking-[0.2em]">Nenhuma notícia encontrada</p>
          </div>
        ) : (
          filteredNews.map((item) => (
            <div key={item.id} className="bg-gradient-to-br from-[#0A0A0A] to-[#141414] rounded-[16px] overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.5)] border border-white/5 group active:scale-[0.97] transition-transform flex flex-col mb-4">
              <div className="flex flex-row">
                <div className="w-[40%] min-h-[160px] relative shrink-0 rounded-l-[16px] overflow-hidden">
                   {item.image_url ? (
                     <img src={item.image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={item.title} />
                   ) : (
                     <div className="w-full h-full bg-[#1A1A1A] flex items-center justify-center">
                       <span className="material-icons text-white/10 text-4xl">image</span>
                     </div>
                   )}
                   <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent opacity-50 md:hidden" />
                </div>
                <div className="w-[60%] p-[16px] flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="bg-[#D4AF37]/15 text-[#D4AF37] text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-[#D4AF37]/20 shadow-sm">
                        {item.tag || 'OFICIAL'}
                      </span>
                      <span className="text-[10px] text-white/40 font-bold flex items-center gap-1.5">
                         <span className="material-icons text-[12px]">calendar_today</span>
                         {formatDatePremium(item.date)}
                      </span>
                    </div>
                    <h3 className="text-[16px] font-black text-white uppercase line-clamp-2 mb-1 leading-[1.4] tracking-tight">
                      {item.title}
                    </h3>
                    <p className="text-white/60 text-[12px] leading-[1.5] font-medium line-clamp-2">
                      {item.description}
                    </p>
                  </div>
                  <div className="mt-3 flex flex-col gap-2">
                    <div className="flex items-center gap-1">
                      <span className="material-icons text-[#D4AF37] text-[12px]">place</span>
                      <span className="text-white/60 text-[11px] font-medium truncate">{item.location || 'Brasil'}</span>
                    </div>
                    <button
                      onClick={() => setSelectedNews(item)}
                      className="w-full bg-[#D4AF37] hover:bg-[#E2C355] text-black font-black text-[10px] uppercase tracking-widest py-2.5 rounded-lg flex items-center justify-center gap-1 transition-colors"
                    >
                      LER NOTÍCIA <span className="material-icons text-[14px]">chevron_right</span>
                    </button>
                  </div>
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
                  As transmissões exibidas são provenientes do YouTube. O aplicativo não hospeda, armazena ou retransmite conteúdo, apenas incorpora players oficiais. A responsabilidade pelos conteúdos é exclusivamente dos canais de origem.
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
