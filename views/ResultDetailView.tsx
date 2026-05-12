import React, { useState, useEffect } from 'react';
import { ResultItem, ResultCategory, ResultLine, View } from '../types';
import { supabase } from '../lib/supabase';
import GuestCTA from '../components/GuestCTA';

interface ResultDetailViewProps {
  resultId?: string;
  onBack: () => void;
}

const ResultDetailView: React.FC<ResultDetailViewProps> = ({ resultId, onBack }) => {
  const [result, setResult] = useState<ResultItem | null>(null);
  const [categories, setCategories] = useState<ResultCategory[]>([]);
  const [lines, setLines] = useState<ResultLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    if (resultId) {
      fetchFullResult();
    }
  }, [resultId]);

  const fetchFullResult = async () => {
    setLoading(true);
    try {
      // Fetch result with event info including image
      const { data: resData, error: resErr } = await supabase
        .from('resultados')
        .select('*, events(*)')
        .eq('id', resultId)
        .single();

      if (resErr) throw resErr;

      const mappedRes = {
        ...resData,
        event_title: resData.events?.title,
        event_park: resData.events?.park,
        event_location: resData.events?.location,
        event_date: `${resData.events?.date_day || ''} ${resData.events?.date_month || ''}`,
        event_image: resData.events?.image_url || resData.events?.imageUrl,
        event_data: resData.events ? {
          ...resData.events,
          imageUrl: resData.events.image_url,
          date: { month: resData.events.date_month, day: resData.events.date_day }
        } : null
      };
      setResult(mappedRes);

      // Fetch categories
      const { data: catData } = await supabase
        .from('resultado_categorias')
        .select('*')
        .eq('resultado_id', resultId)
        .order('ordem', { ascending: true });
      
      setCategories(catData || []);
      if (catData && catData.length > 0) {
        setActiveCategory(catData[0].id);
      }

      // Fetch lines with profile info
      const { data: lineData } = await supabase
        .from('resultado_linhas')
        .select('*, profiles:usuario_vinculado_id(username, name, avatar_url)')
        .eq('resultado_id', resultId)
        .order('ordem', { ascending: true });
      
      setLines(lineData || []);

    } catch (err) {
      console.error('Error fetching result:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!result) return;
    const shareUrl = `${window.location.origin}/?result=${result.id}`;
    const text = `Confira o resultado oficial da ${result.event_title} no +Vaquejada.`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Resultado Oficial',
          text: text,
          url: shareUrl
        });
      } catch (err) {}
    } else {
      await navigator.clipboard.writeText(`${text} ${shareUrl}`);
      alert('Link copiado para a área de transferência!');
    }
  };

  const navigateToProfile = (username: string) => {
    window.dispatchEvent(new CustomEvent('arena_navigate', { 
      detail: { view: View.PROFILE, username } 
    }));
  };

  const navigateToEvent = () => {
    if (result?.event_data) {
      window.dispatchEvent(new CustomEvent('arena_navigate', { 
        detail: { view: View.EVENT_DETAILS, event: result.event_data } 
      }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F0A05] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-[#0F0A05] flex flex-col items-center justify-center p-6 text-center">
        <span className="material-icons text-6xl text-[#D4AF37]/20 mb-4">error_outline</span>
        <h2 className="text-xl font-black text-white uppercase italic mb-2">Resultado não encontrado</h2>
        <p className="text-white/40 text-sm mb-6">O resultado solicitado pode ter sido removido ou ainda não foi publicado.</p>
        <button onClick={onBack} className="bg-[#D4AF37] text-white px-8 py-3 rounded-full font-black uppercase text-xs tracking-widest">Voltar</button>
      </div>
    );
  }

  const filteredLines = lines.filter(l => l.categoria_id === activeCategory);

  return (
    <div className="min-h-screen bg-[#0F0A05] pb-24 animate-in fade-in duration-500 overflow-x-hidden">
      
      {/* Header Premium - Hero Reduzido */}
      <div className="relative h-60 w-full overflow-hidden">
        <img 
          src={result.capa_url || result.event_image || 'https://picsum.photos/seed/' + result.id + '/1200/800'} 
          className="w-full h-full object-cover scale-105" 
        />
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F0A05] via-transparent to-black/40" />
        
        <button onClick={onBack} className="absolute top-8 left-6 w-10 h-10 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white z-20 active:scale-90 transition-all">
          <span className="material-icons text-xl">arrow_back</span>
        </button>

        <div className="absolute bottom-6 left-6 right-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-[#D4AF37] text-black text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter">RESULTADO OFICIAL</div>
          </div>
          <h1 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-1 drop-shadow-xl truncate">{result.event_title}</h1>
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-1">
                <span className="material-icons text-[10px] text-[#D4AF37]">place</span>
                <span className="text-[9px] font-black text-white/60 uppercase tracking-widest">{result.event_park}</span>
             </div>
             <div className="flex items-center gap-1">
                <span className="material-icons text-[10px] text-[#D4AF37]">calendar_today</span>
                <span className="text-[9px] font-black text-white/60 uppercase tracking-widest">{result.event_date}</span>
             </div>
          </div>
        </div>
      </div>

      {/* Card Principal de Resumo */}
      <div className="px-6 -mt-4 relative z-20 mb-6">
        <div className="bg-[#18120D] border border-white/5 rounded-[24px] p-4 shadow-2xl flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl overflow-hidden border border-white/5 shrink-0">
             <img src={result.event_image} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
             <p className="text-[7px] font-black text-[#D4AF37] uppercase tracking-widest mb-0.5">Vaquejada Associada</p>
             <h3 className="text-sm font-black text-white uppercase italic truncate mb-1">{result.event_title}</h3>
             <div className="flex items-center gap-2">
                <span className="text-[8px] font-bold text-white/40 uppercase">{result.event_location}</span>
                <span className="w-1 h-1 rounded-full bg-white/10" />
                <span className="text-[8px] font-black text-green-500 uppercase tracking-widest flex items-center gap-0.5">
                   <span className="material-icons text-[8px]">check_circle</span> Publicado
                </span>
             </div>
          </div>
          <button onClick={handleShare} className="w-9 h-9 rounded-xl bg-white/5 text-white/60 flex items-center justify-center border border-white/5 active:scale-90 transition-all shrink-0">
            <span className="material-icons text-base">share</span>
          </button>
        </div>
      </div>

      <GuestCTA user={user} />

      {/* Indicadores / Métricas */}
      <div className="px-6 grid grid-cols-3 gap-3 mb-8">
         <div className="bg-[#18120D] border border-white/5 rounded-2xl p-3 text-center">
            <p className="text-[7px] font-black text-white/20 uppercase tracking-widest mb-1">Categorias</p>
            <p className="text-sm font-black text-[#D4AF37]">{categories.length}</p>
         </div>
         <div className="bg-[#18120D] border border-white/5 rounded-2xl p-3 text-center">
            <p className="text-[7px] font-black text-white/20 uppercase tracking-widest mb-1">Vaqueiros</p>
            <p className="text-sm font-black text-[#D4AF37]">{lines.length}</p>
         </div>
         <div className="bg-[#18120D] border border-white/5 rounded-2xl p-3 text-center">
            <p className="text-[7px] font-black text-white/20 uppercase tracking-widest mb-1">Registros</p>
            <p className="text-sm font-black text-[#D4AF37]">{lines.length}</p>
         </div>
      </div>

      {/* Abas de Categorias - Scroll Horizontal Chips */}
      <div className="mb-6">
        <div className="flex gap-2 overflow-x-auto hide-scrollbar px-6 pb-2">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${
                activeCategory === cat.id
                  ? 'bg-[#D4AF37] border-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/20'
                  : 'bg-white/5 border-white/5 text-white/40'
              }`}
            >
              {cat.nome_categoria}
            </button>
          ))}
        </div>
      </div>

      {/* Área de Resultados / Ranking */}
      <div className="px-6 space-y-4 min-h-[200px]">
        {filteredLines.length === 0 ? (
          <div className="bg-[#18120D] border border-white/5 rounded-3xl p-10 flex flex-col items-center text-center">
             <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/20 mb-4">
                <span className="material-icons">assignment_late</span>
             </div>
             <h4 className="text-[10px] font-black text-white uppercase tracking-widest mb-1">Nenhum resultado cadastrado</h4>
             <p className="text-[9px] text-white/40 font-bold max-w-[200px]">Assim que o resultado desta categoria for publicado, ele aparecerá aqui.</p>
          </div>
        ) : filteredLines.map((line, idx) => {
          const profile = (line as any).profiles;
          const isWinner = line.colocacao === '1º' || line.colocacao === '1' || (!line.colocacao && idx === 0);
          
          return (
            <div key={idx} className={`bg-[#18120D] border rounded-[28px] overflow-hidden shadow-sm transition-all ${isWinner ? 'border-[#D4AF37]/40 ring-1 ring-[#D4AF37]/20' : 'border-white/5'}`}>
              <div className="p-4 flex gap-4 items-center">
                <div className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center shrink-0 shadow-lg ${isWinner ? 'bg-[#D4AF37] text-black' : 'bg-white/5 text-white/40'}`}>
                  <span className="text-[7px] font-black leading-none mb-0.5">POS</span>
                  <span className="text-base font-black leading-none">{line.colocacao || (idx + 1 + 'º')}</span>
                </div>
                
                <div className="flex-1 min-w-0">
                   <h3 className={`font-black uppercase italic tracking-tight text-sm leading-tight truncate mb-1 ${isWinner ? 'text-[#D4AF37]' : 'text-white'}`}>
                      {line.nome_competidor}
                   </h3>
                   <div className="flex flex-wrap gap-x-3 gap-y-1">
                      {line.nome_equipe && (
                        <div className="flex items-center gap-1 opacity-60">
                           <span className="material-icons text-[10px]">group</span>
                           <span className="text-[8px] font-black uppercase tracking-widest truncate max-w-[100px]">{line.nome_equipe}</span>
                        </div>
                      )}
                      {line.cavalo && (
                        <div className="flex items-center gap-1 opacity-60">
                           <span className="material-icons text-[10px]">pets</span>
                           <span className="text-[8px] font-black uppercase italic truncate max-w-[100px]">{line.cavalo}</span>
                        </div>
                      )}
                   </div>
                </div>

                {profile ? (
                  <button onClick={() => navigateToProfile(profile.username)} className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 active:scale-90 transition-transform">
                    <img src={profile.avatar_url || `https://ui-avatars.com/api/?name=${profile.name}`} className="w-full h-full object-cover" />
                  </button>
                ) : (
                   <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/10">
                      <span className="material-icons text-lg">person</span>
                   </div>
                )}
              </div>

              {(line.pontos || line.tempo || line.cidade) && (
                <div className="px-4 py-2.5 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
                   <div className="flex gap-4">
                      {line.pontos && (
                        <div className="flex flex-col">
                           <span className="text-[6px] font-black text-white/20 uppercase tracking-widest mb-0.5">Pontos</span>
                           <span className="text-[10px] font-black text-[#D4AF37] leading-none">{line.pontos}</span>
                        </div>
                      )}
                      {line.tempo && (
                        <div className="flex flex-col">
                           <span className="text-[6px] font-black text-white/20 uppercase tracking-widest mb-0.5">Tempo</span>
                           <span className="text-[10px] font-black text-[#D4AF37] leading-none">{line.tempo}</span>
                        </div>
                      )}
                   </div>
                   {line.cidade && (
                     <div className="text-[8px] font-black text-white/20 uppercase italic truncate max-w-[100px]">{line.cidade}</div>
                   )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {result.descricao && (
        <div className="px-6 mt-10">
          <div className="bg-[#18120D] border border-white/5 rounded-3xl p-5">
            <div className="flex items-center gap-2 mb-3">
               <span className="material-icons text-sm text-[#D4AF37]">info</span>
               <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Informações Adicionais</p>
            </div>
            <p className="text-xs text-white/60 leading-relaxed font-medium">{result.descricao}</p>
          </div>
        </div>
      )}

      {/* Galeria de Fotos - Grid Horizontal Elegante */}
      {result.event_data && (
        <div className="mt-10">
           <div className="px-10 flex items-center justify-between mb-4">
              <h3 className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Fotos e Anexos</h3>
              <div className="h-[1px] flex-1 bg-white/5 ml-4" />
           </div>
           <div className="flex gap-4 overflow-x-auto hide-scrollbar px-10 pb-4">
              {[result.event_image, ...(result.event_data.galeria_urls || [])].filter(Boolean).map((img, idx) => (
                <div 
                  key={idx} 
                  className="w-48 h-32 rounded-[24px] overflow-hidden border border-white/5 shrink-0 shadow-lg active:scale-95 transition-transform cursor-pointer"
                >
                  <img src={img} className="w-full h-full object-cover" />
                </div>
              ))}
           </div>
        </div>
      )}

      {/* Botão Final Compacto */}
      <div className="px-6 mt-12 mb-16 flex justify-center">
         <button 
           onClick={navigateToEvent}
           className="bg-white/5 border border-white/5 text-white/40 px-8 py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center gap-3 active:scale-95 transition-all"
         >
           <span className="material-icons text-base">calendar_today</span> Ver detalhes do evento
         </button>
      </div>

    </div>
  );
};

export default ResultDetailView;
