import React from 'react';
import { NewsItem, User } from '../types';

import { supabase } from '../lib/supabase';
const TABS = ['TUDO', 'EVENTOS', 'REGULAMENTO', 'NOTÍCIAS'];

interface NewsViewProps {
    user?: User | null;
}

const NewsView: React.FC<NewsViewProps> = ({ user }) => {
  const [localNews, setLocalNews] = React.useState<any[]>([]);
  const [activeTab, setActiveTab] = React.useState('TUDO');
  
  const [selectedNews, setSelectedNews] = React.useState<any | null>(null);

  React.useEffect(() => {
    const fetchNews = async () => {
      const { data } = await supabase.from('news').select('*').eq('is_paused', false).order('created_at', { ascending: false });
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

    // Read Mode

  // ---- READING MODE ----
  if (selectedNews) {
      return (
          <div className="min-h-[100vh] bg-[#F5F1E9] p-6 pb-48 animate-in slide-in-from-right duration-300 relative z-[50] -m-6 rounded-xl">
              <header className="flex justify-between items-center mb-8 pt-6">
                  <button onClick={() => setSelectedNews(null)} className="w-10 h-10 rounded-full bg-[#1A1108]/10 flex items-center justify-center border border-[#1A1108]/20 active:scale-95 transition-transform">
                      <span className="material-icons text-[#1A1108]">arrow_back</span>
                  </button>
                  <div className="flex gap-2">
                        {/* Admin actions removed, now available in Admin Panel */}
                  </div>
              </header>

              <article className="max-w-xl mx-auto">
                  <div className="mb-6 flex items-center justify-between">
                     <span className="bg-[#ECA413] text-white text-[10px] font-black px-3 py-1.5 rounded flex items-center gap-1 shadow-md shadow-[#ECA413]/20">
                       <span className="material-icons text-[12px]">verified</span> {selectedNews.tag}
                     </span>
                     <span className="text-xs text-[#1A1108]/60 font-bold">{selectedNews.date}</span>
                  </div>

                  <h1 className="text-4xl font-black text-[#1A1108] uppercase leading-none font-display mb-6">
                      {selectedNews.title}
                  </h1>

                  <div className="w-12 h-1 bg-[#ECA413] mb-8 rounded-full"></div>

                  <div className="w-full text-[#1A1108]/80 font-medium leading-relaxed text-base space-y-6">
                      <p>{selectedNews.description}</p>
                      <p className="p-4 bg-white/80 border border-[#1A1108]/10 rounded-xl text-sm shadow-sm mt-8 text-[#1A1108]">
                        <b className="text-[#1A1108]">Aviso Informativo:</b> Recomendamos sempre verificar fontes oficiais no portal web caso ainda haja dúvidas e ler atentamente as instruções anexas se existirem nesta página de comunicações!
                      </p>
                  </div>
                  
                  {/* Fake Attachments simulation */}
                  {(selectedNews.id === '2' || selectedNews.id === '3' || selectedNews.tag === 'URGENTE') && (
                      <div className="mt-12 bg-[#1A1108]/5 border border-[#1A1108]/10 rounded-2xl p-6">
                          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1A1108]/40 mb-4">Anexos da Notícia</h4>
                          <div className="space-y-3">
                              <button onClick={() => alert('Baixando PDF...')} className="w-full bg-white border border-[#1A1108]/10 p-4 rounded-xl flex items-center justify-between group active:scale-95 transition-transform shadow-sm">
                                  <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center shrink-0">
                                          <span className="material-icons text-red-500">picture_as_pdf</span>
                                      </div>
                                      <div className="text-left flex-1 min-w-0 pr-3 text-[#1A1108]">
                                          <p className="text-sm font-bold truncate">Documento Oficial.pdf</p>
                                          <p className="text-[10px] opacity-60 font-bold">3.2 MB</p>
                                      </div>
                                  </div>
                                  <span className="material-icons text-[#1A1108]/20 group-hover:text-[#ECA413] transition-colors shrink-0">download</span>
                              </button>
                          </div>
                      </div>
                  )}
              </article>
          </div>
      );
  }

  // ---- LIST MODE ----
  return (
    <div className="p-6 pb-24">
      <header className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <span className="material-icons text-primary-orange">campaign</span>
            <h1 className="text-3xl font-black uppercase text-primary font-display">+VAQUEJADA</h1>
          </div>
          <div className="flex gap-2">
            <button
                onClick={() => alert('Buscando notícias...')}
                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 active:scale-95 transition-transform"
            >
              <span className="material-icons text-xl">search</span>
            </button>
            <button
                onClick={() => alert('Abrindo painel de notificações...')}
                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 active:scale-95 transition-transform"
            >
              <span className="material-icons text-xl">notifications</span>
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-8 overflow-x-auto hide-scrollbar">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-full font-bold text-xs whitespace-nowrap border-2 transition-colors active:scale-95 ${activeTab === tab ? 'bg-primary-orange border-primary-orange text-white' : 'border-white/10 text-white/40 hover:bg-white/5'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="mb-8 flex flex-col sm:flex-row justify-between sm:items-end gap-4">
          <div>
            <h2 className="text-4xl font-black text-primary-orange uppercase leading-none mb-2 font-display tracking-tight">ARENA NOTÍCIAS</h2>
            <p className="text-white/40 text-sm">O seu canal oficial de informações</p>
          </div>
        </div>
      </header>

      <div className="space-y-6">
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
                {item.id === '3' ? (
                  <>
                    <span className="text-[10px] font-bold text-leather/40 uppercase tracking-widest">EVENTO ID: #PP2024</span>
                    <button
                        onClick={() => alert('Redirecionando para garantir a senha do evento...')}
                        className="bg-primary-orange text-white px-4 py-2 rounded-lg font-black uppercase text-[9px] tracking-widest shadow-lg shadow-primary-orange/20 active:scale-95 transition-transform"
                    >
                        GARANTIR SENHA
                    </button>
                  </>
                ) : item.id === '2' ? (
                  <>
                    <div className="flex gap-2">
                      <span className="w-8 h-8 rounded-full bg-primary-orange flex items-center justify-center text-white cursor-pointer hover:opacity-80 transition-opacity" onClick={() => alert('Baixando anexo: Regulamento PDF')}><span className="material-icons text-sm">description</span></span>
                      <span className="w-8 h-8 rounded-full bg-leather flex items-center justify-center text-white cursor-pointer hover:opacity-80 transition-opacity" onClick={() => alert('Visualizando anexo: Foto explicativa')}><span className="material-icons text-sm">photo</span></span>
                    </div>
                    <button
                        onClick={() => setSelectedNews(item)}
                        className="text-primary-orange font-black text-[9px] uppercase tracking-widest flex items-center gap-1 hover:opacity-80 transition-opacity"
                    >
                        ANEXOS PDF <span className="material-icons text-sm">chevron_right</span>
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] font-black text-primary-orange uppercase tracking-widest">URGENTE</span>
                    <button
                        className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity bg-leather/5 px-2 py-1 rounded"
                        onClick={() => setSelectedNews(item)}
                    >
                      <span className="material-icons text-leather/40 text-[14px]">attachment</span>
                      <span className="text-[9px] font-black text-leather/60">ANEXOS</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )))}
      </div>

      <div className="mt-12 text-center pb-8 opacity-20">
        <span className="material-icons text-6xl text-primary">shield</span>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] mt-2">Autenticidade Garantida</p>
      </div>
    </div>
  );
};

export default NewsView;
