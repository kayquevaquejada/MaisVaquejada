import React, { useState, useEffect } from 'react';
import { ResultItem, ResultCategory, ResultLine, View } from '../types';
import { supabase } from '../lib/supabase';

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
      // Fetch result with event info
      const { data: resData, error: resErr } = await supabase
        .from('resultados')
        .select('*, events(title, park, location, date_day, date_month)')
        .eq('id', resultId)
        .single();

      if (resErr) throw resErr;

      const mappedRes = {
        ...resData,
        event_title: resData.events?.title,
        event_park: resData.events?.park,
        event_location: resData.events?.location,
        event_date: `${resData.events?.date_day} ${resData.events?.date_month}`
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

      // Fetch lines
      const { data: lineData } = await supabase
        .from('resultado_linhas')
        .select('*')
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
    <div className="min-h-screen bg-[#0F0A05] pb-24 animate-in fade-in duration-500">
      
      {/* Header Premium */}
      <div className="relative h-64 w-full overflow-hidden">
        <img 
          src={result.capa_url || 'https://picsum.photos/seed/' + result.id + '/1200/800'} 
          className="w-full h-full object-cover blur-[2px] scale-110 opacity-40" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F0A05] via-[#0F0A05]/40 to-black/60" />
        
        <button onClick={onBack} className="absolute top-6 left-6 w-10 h-10 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white z-20 active:scale-90 transition-all">
          <span className="material-icons">arrow_back</span>
        </button>

        <div className="absolute bottom-8 left-6 right-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-[#D4AF37] text-black text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-tighter">Resultado Oficial</div>
            <span className="text-white/40 text-[9px] font-bold uppercase tracking-widest">• {result.event_date}</span>
          </div>
          <h1 className="text-3xl font-black text-white italic leading-tight uppercase tracking-tighter mb-1">{result.event_title}</h1>
          <p className="text-[#D4AF37] text-[10px] font-black uppercase tracking-[0.2em]">{result.event_park} • {result.event_location}</p>
        </div>
      </div>

      {/* Resumo e Share */}
      <div className="px-6 -mt-4 relative z-10 flex justify-between items-end mb-8">
        <div className="flex gap-4">
           <div className="bg-[#1A1108] border border-white/10 rounded-2xl p-4 shadow-xl">
              <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-0.5">Categorias</p>
              <p className="text-lg font-black text-[#D4AF37] leading-none">{categories.length}</p>
           </div>
           <div className="bg-[#1A1108] border border-white/10 rounded-2xl p-4 shadow-xl">
              <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-0.5">Vaqueiros</p>
              <p className="text-lg font-black text-[#D4AF37] leading-none">{lines.length}</p>
           </div>
        </div>
        <button onClick={handleShare} className="w-12 h-12 rounded-2xl bg-[#D4AF37] text-white flex items-center justify-center shadow-lg shadow-[#D4AF37]/20 active:scale-90 transition-all">
          <span className="material-icons">share</span>
        </button>
      </div>

      {/* Abas de Categorias */}
      <div className="px-6 mb-6">
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${
                activeCategory === cat.id
                  ? 'bg-[#D4AF37] border-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/20'
                  : 'bg-white/5 border-white/10 text-white/40'
              }`}
            >
              {cat.nome_categoria}
            </button>
          ))}
        </div>
      </div>

      {/* Ranking */}
      <div className="px-6 space-y-3">
        {filteredLines.length === 0 ? (
          <div className="py-20 flex flex-col items-center opacity-20">
             <span className="material-icons text-5xl mb-2">list_alt</span>
             <p className="text-[10px] font-black uppercase tracking-widest">Nenhum registro nesta categoria</p>
          </div>
        ) : filteredLines.map((line, idx) => (
          <div key={idx} className="bg-[#1A1108] border border-white/10 rounded-[28px] overflow-hidden shadow-sm relative group">
            <div className="p-5 flex gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#D4AF37] to-[#8C6D1F] rounded-2xl flex flex-col items-center justify-center shrink-0 shadow-lg">
                <span className="text-[10px] font-black text-black/40 leading-none">POS</span>
                <span className="text-lg font-black text-black leading-none">{line.colocacao || (idx + 1 + 'º')}</span>
              </div>
              
              <div className="flex-1">
                <h3 className="font-black text-white uppercase italic tracking-tight text-lg leading-tight mb-1">{line.nome_competidor}</h3>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {line.nome_equipe && (
                    <div className="flex items-center gap-1.5">
                      <span className="material-icons text-[12px] text-[#D4AF37]">group</span>
                      <span className="text-[10px] font-bold text-white/60 uppercase">{line.nome_equipe}</span>
                    </div>
                  )}
                  {line.cavalo && (
                    <div className="flex items-center gap-1.5">
                      <span className="material-icons text-[12px] text-[#D4AF37]">pets</span>
                      <span className="text-[10px] font-bold text-white/60 uppercase">{line.cavalo}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Rodapé da linha com métricas */}
            {(line.pontos || line.tempo || line.cidade) && (
              <div className="px-5 py-3 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
                 <div className="flex gap-4">
                    {line.pontos && (
                      <div className="flex flex-col">
                        <span className="text-[7px] font-black text-white/30 uppercase tracking-widest">Pontos</span>
                        <span className="text-xs font-black text-[#D4AF37]">{line.pontos}</span>
                      </div>
                    )}
                    {line.tempo && (
                      <div className="flex flex-col">
                        <span className="text-[7px] font-black text-white/30 uppercase tracking-widest">Tempo</span>
                        <span className="text-xs font-black text-[#D4AF37]">{line.tempo}</span>
                      </div>
                    )}
                 </div>
                 {line.cidade && (
                   <div className="text-[9px] font-bold text-white/20 uppercase italic">{line.cidade}</div>
                 )}
              </div>
            )}
          </div>
        ))}
      </div>

      {result.descricao && (
        <div className="px-6 mt-10">
          <div className="bg-white/5 border border-white/10 rounded-[32px] p-6">
            <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest mb-2">Informações Adicionais</p>
            <p className="text-sm text-white/60 leading-relaxed italic">{result.descricao}</p>
          </div>
        </div>
      )}

      {/* Botão Voltar para Evento */}
      <div className="px-6 mt-10 mb-20">
         <button 
           onClick={() => {
             // Logic to find event and navigate back to detail
             onBack();
           }}
           className="w-full bg-white/5 border border-white/10 text-white/60 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all"
         >
           <span className="material-icons text-sm">event</span> Voltar para detalhes do evento
         </button>
      </div>

    </div>
  );
};

export default ResultDetailView;
