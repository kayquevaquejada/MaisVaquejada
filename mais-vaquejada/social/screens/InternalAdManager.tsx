import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { InternalAdCampaign } from '../types/ads';

export const InternalAdManager: React.FC<{ user: any; onBack: () => void }> = ({ user, onBack }) => {
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'LIST' | 'FORM'>('LIST');
  const [campaigns, setCampaigns] = useState<InternalAdCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<Record<string, { impressions: number, clicks: number }>>({});

  // Form State matching the 7 blocks
  const [formData, setFormData] = useState<Partial<InternalAdCampaign>>({
    status: 'draft',
    placement: 'social_feed_native',
    media_type: 'image',
    action_type: 'open_external_link',
    contract_type: 'period',
    priority: 0,
    weight: 1,
    is_premium: false,
    requires_approval: true
  });

  useEffect(() => {
    if (activeTab === 'LIST' || activeTab === 'DASHBOARD') fetchCampaigns();
  }, [activeTab]);

  const fetchCampaigns = async () => {
    setLoading(true);
    const { data } = await supabase.from('internal_ad_campaigns').select('*').order('created_at', { ascending: false });
    setCampaigns(data || []);
    
    if (data && data.length > 0) {
      const newMetrics: Record<string, { impressions: number, clicks: number }> = {};
      await Promise.all(data.map(async (c) => {
        const [{ count: impressions }, { count: clicks }] = await Promise.all([
          supabase.from('internal_ad_impressions').select('*', { count: 'exact', head: true }).eq('campaign_id', c.id),
          supabase.from('internal_ad_clicks').select('*', { count: 'exact', head: true }).eq('campaign_id', c.id)
        ]);
        newMetrics[c.id] = { impressions: impressions || 0, clicks: clicks || 0 };
      }));
      setMetrics(newMetrics);
    }
    
    setLoading(false);
  };

  const handleSave = async () => {
    try {
      const payload = {
        ...formData,
        [editingId ? 'updated_by' : 'created_by']: user?.id,
      };

      if (editingId) {
        await supabase.from('internal_ad_campaigns').update(payload).eq('id', editingId);
      } else {
        await supabase.from('internal_ad_campaigns').insert(payload);
      }
      
      alert(editingId ? 'Campanha editada com sucesso!' : 'Campanha criada com sucesso!');
      setActiveTab('LIST');
      setEditingId(null);
      fetchCampaigns();
    } catch (err: any) {
      alert(`Erro ao salvar: ${err.message}`);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    await supabase.from('internal_ad_campaigns').update({ status: newStatus }).eq('id', id);
    fetchCampaigns();
  };

  // -------------------------------------------------------------
  // Render: LIST
  // -------------------------------------------------------------
  const renderList = () => (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-black text-[#ECA413] tracking-tighter uppercase italic text-xl">Campanhas</h3>
        <button 
          onClick={() => { setEditingId(null); setFormData({ status: 'draft', placement: 'social_feed_native', media_type: 'image', action_type: 'open_external_link', contract_type: 'period', is_premium: false }); setActiveTab('FORM'); }}
          className="bg-[#ECA413] text-black px-4 py-2 rounded-xl text-xs font-black uppercase shadow-lg shadow-[#ECA413]/20 hover:scale-105 active:scale-95 transition-transform"
        >
          Criar Nova
        </button>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <p className="text-white/40 text-center py-20 text-xs font-black tracking-widest uppercase animate-pulse">Carregando...</p>
        ) : campaigns.length === 0 ? (
          <div className="bg-white/5 border border-white/5 p-12 text-center rounded-3xl">
            <p className="text-white/40 text-xs font-black tracking-widest uppercase">Nenhuma campanha registrada.</p>
          </div>
        ) : (
          campaigns.map(c => (
            <div key={c.id} className="bg-white/5 border border-white/5 p-5 rounded-2xl flex items-center gap-4 hover:border-white/10 transition-colors">
              <div className="w-16 h-16 bg-black rounded-xl overflow-hidden shrink-0 border border-white/10">
                {c.main_media_url ? <img src={c.main_media_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white/20"><span className="material-icons">image</span></div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${c.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-white/10 text-white/50'}`}>
                    {c.status}
                  </span>
                  {c.is_premium && <span className="bg-[#ECA413]/10 text-[#ECA413] text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded">Premium</span>}
                </div>
                <h4 className="text-white font-black text-sm truncate uppercase">{c.internal_name}</h4>
                <p className="text-white/40 text-[10px] font-bold truncate">{c.advertiser_name} • {c.placement}</p>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <div className="flex gap-2">
                  <button onClick={() => updateStatus(c.id, c.status === 'active' ? 'paused' : 'active')} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/60 hover:text-white" title="Alternar Status">
                    <span className="material-icons text-[16px]">{c.status === 'active' ? 'pause' : 'play_arrow'}</span>
                  </button>
                  <button onClick={() => { setEditingId(c.id); setFormData(c); setActiveTab('FORM'); }} className="w-8 h-8 rounded-lg bg-[#ECA413]/10 flex items-center justify-center text-[#ECA413] hover:bg-[#ECA413]/20" title="Editar">
                    <span className="material-icons text-[16px]">edit</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  // -------------------------------------------------------------
  // Render: FORM (The 7 enterprise blocks requested)
  // -------------------------------------------------------------
  const renderForm = () => (
    <div className="p-6 space-y-8 animate-in fade-in pb-32">
      <div className="flex items-center gap-4 border-b border-white/10 pb-4">
        <button onClick={() => setActiveTab('LIST')} className="material-icons text-white/60 hover:text-white transition-colors">arrow_back</button>
        <h2 className="text-xl font-black italic tracking-tight text-white uppercase">{editingId ? 'Editar Campanha' : 'Configurar Nova Campanha'}</h2>
      </div>

      {/* Bloco 1 - Identificação */}
      <section className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-4">
        <h3 className="text-[#ECA413] text-xs font-black uppercase tracking-widest flex items-center gap-2"><span className="material-icons text-[16px]">badge</span> 1. Identificação</h3>
        <input type="text" placeholder="Nome Interno (Ex: Banner LocalNet Verão)" value={formData.internal_name || ''} onChange={e => setFormData({ ...formData, internal_name: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-[#ECA413]" />
        <div className="grid grid-cols-2 gap-4">
          <input type="text" placeholder="Nome Público do Anunciante" value={formData.advertiser_name || ''} onChange={e => setFormData({ ...formData, advertiser_name: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-[#ECA413]" />
          <input type="text" placeholder="URL da Logo do Anunciante (Opcional)" value={formData.advertiser_logo_url || ''} onChange={e => setFormData({ ...formData, advertiser_logo_url: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-[#ECA413]" />
        </div>
      </section>

      {/* Bloco 2 - Criativo */}
      <section className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-4">
        <h3 className="text-[#ECA413] text-xs font-black uppercase tracking-widest flex items-center gap-2"><span className="material-icons text-[16px]">brush</span> 2. Criativo</h3>
        <input type="text" placeholder="Título Forte (Ex: Conheça o novo haras)" value={formData.public_title || ''} onChange={e => setFormData({ ...formData, public_title: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-[#ECA413]" />
        <textarea placeholder="Descrição Curta" value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-[#ECA413] min-h-[80px]" />
        <div className="grid grid-cols-2 gap-4">
          <input type="text" placeholder="URL da Mídia (Imagem/Vídeo)" value={formData.main_media_url || ''} onChange={e => setFormData({ ...formData, main_media_url: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-[#ECA413]" />
          <input type="text" placeholder="Texto do Botão / CTA" value={formData.cta_text || ''} onChange={e => setFormData({ ...formData, cta_text: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-[#ECA413]" />
        </div>
      </section>

      {/* Bloco 3 - Ação */}
      <section className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-4">
        <h3 className="text-[#ECA413] text-xs font-black uppercase tracking-widest flex items-center gap-2"><span className="material-icons text-[16px]">touch_app</span> 3. Ação do Anúncio</h3>
        <div className="grid grid-cols-2 gap-4">
          <select value={formData.action_type || 'open_external_link'} onChange={e => setFormData({ ...formData, action_type: e.target.value as any })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#ECA413]">
            <option value="open_external_link">Abrir Link Externo</option>
            <option value="open_profile">Abrir Perfil no App</option>
            <option value="open_whatsapp">Abrir WhatsApp</option>
          </select>
          <input type="text" placeholder="Valor da Ação (URL, Perfil, Telefone)" value={formData.action_value || ''} onChange={e => setFormData({ ...formData, action_value: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-[#ECA413]" />
        </div>
      </section>

      {/* Bloco 4 - Entrega */}
      <section className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-4">
        <h3 className="text-[#ECA413] text-xs font-black uppercase tracking-widest flex items-center gap-2"><span className="material-icons text-[16px]">rocket_launch</span> 4. Entrega e Posicionamento</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] text-white/40 font-black uppercase mb-1 block">Placement (Local)</label>
            <select value={formData.placement || 'social_feed_native'} onChange={e => setFormData({ ...formData, placement: e.target.value as any })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#ECA413]">
              <option value="social_feed_native">Feed Social (Nativo)</option>
              <option value="story_sponsored">Stories (Status Patrocinado)</option>
              <option value="dm_sponsored_slot">Direct Messages (Inbox Ads)</option>
              <option value="video_call_waiting">Chamada de Vídeo (Fundo)</option>
            </select>
          </div>
          <div>
             <label className="text-[10px] text-white/40 font-black uppercase mb-1 block">Status Inicial</label>
             <select value={formData.status || 'draft'} onChange={e => setFormData({ ...formData, status: e.target.value as any })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#ECA413]">
              <option value="draft">Rascunho (Draft)</option>
              <option value="active">Ativo Imediatamente</option>
              <option value="paused">Pausado</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <input type="datetime-local" placeholder="Início (Opcional)" value={formData.start_at ? formData.start_at.substring(0, 16) : ''} onChange={e => setFormData({ ...formData, start_at: e.target.value ? new Date(e.target.value).toISOString() : undefined })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-[#ECA413] color-scheme-dark" />
          <input type="datetime-local" placeholder="Término (Opcional)" value={formData.end_at ? formData.end_at.substring(0, 16) : ''} onChange={e => setFormData({ ...formData, end_at: e.target.value ? new Date(e.target.value).toISOString() : undefined })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-[#ECA413] color-scheme-dark" />
        </div>
      </section>

      {/* Bloco 5 - Comercial e Bloco 6 - Premium */}
      <section className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-4">
        <h3 className="text-[#ECA413] text-xs font-black uppercase tracking-widest flex items-center gap-2"><span className="material-icons text-[16px]">monetization_on</span> 5. Dados Comerciais</h3>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-white font-bold cursor-pointer">
            <input type="checkbox" checked={formData.is_premium || false} onChange={e => setFormData({ ...formData, is_premium: e.target.checked })} className="accent-[#ECA413] w-4 h-4" />
            Campanha Premium (Destacada e Prioritária)
          </label>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <input type="number" placeholder="Budget / R$" value={formData.budget_amount || ''} onChange={e => setFormData({ ...formData, budget_amount: Number(e.target.value) })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-[#ECA413]" />
          <input type="number" placeholder="Meta Impressões (Máx)" value={formData.max_impressions || ''} onChange={e => setFormData({ ...formData, max_impressions: Number(e.target.value) })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-[#ECA413]" />
          <input type="number" placeholder="Peso Logístico (Ex: 10)" value={formData.weight || 1} onChange={e => setFormData({ ...formData, weight: Number(e.target.value) })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-[#ECA413]" />
        </div>
      </section>

      {/* Sticky Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background-dark via-background-dark to-transparent flex justify-end">
        <button onClick={handleSave} className="bg-[#ECA413] text-black px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-[#ECA413]/20 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all">
          <span className="material-icons">save</span>
          {editingId ? 'Salvar Edição' : 'Lançar Campanha'}
        </button>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="p-6 space-y-6 pb-32">
      <div className="flex items-center gap-4 border-b border-white/10 pb-4">
        <h2 className="text-xl font-black italic tracking-tight text-white uppercase">Analytics</h2>
      </div>
      <div className="grid gap-4">
        {loading ? (
           <p className="text-white/40 text-center py-20 text-xs font-black tracking-widest uppercase animate-pulse">Carregando Métricas...</p>
        ) : campaigns.length === 0 ? (
           <div className="bg-white/5 border border-white/5 p-12 text-center rounded-3xl">
             <p className="text-white/40 text-xs font-black tracking-widest uppercase">Nenhuma campanha para analisar.</p>
           </div>
        ) : campaigns.map(c => {
           const met = metrics[c.id] || { impressions: 0, clicks: 0 };
           const ctr = met.impressions > 0 ? ((met.clicks / met.impressions) * 100).toFixed(2) : '0.00';
           
           return (
            <div key={c.id} className="bg-white/5 border border-white/5 p-5 rounded-2xl animate-in fade-in">
              <div className="flex items-center gap-3 mb-4 border-b border-white/5 pb-4">
                 <div className="w-10 h-10 bg-[#ECA413]/10 rounded-xl flex items-center justify-center text-[#ECA413]">
                    <span className="material-icons">campaign</span>
                 </div>
                 <div className="flex-1">
                    <h4 className="text-white font-black text-sm uppercase truncate">{c.internal_name}</h4>
                    <p className="text-white/40 text-[10px] font-bold truncate">{c.advertiser_name} • {c.status}</p>
                 </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                 <div className="bg-black/50 p-3 rounded-xl border border-white/5">
                    <p className="text-lg font-black text-white">{met.impressions.toLocaleString()}</p>
                    <p className="text-[8px] text-white/40 font-bold uppercase tracking-widest mt-1">Impressões</p>
                 </div>
                 <div className="bg-black/50 p-3 rounded-xl border border-white/5">
                    <p className="text-lg font-black text-[#ECA413]">{met.clicks.toLocaleString()}</p>
                    <p className="text-[8px] text-[#ECA413]/60 font-bold uppercase tracking-widest mt-1">Cliques</p>
                 </div>
                 <div className="bg-black/50 p-3 rounded-xl border border-white/5">
                    <p className="text-lg font-black text-green-400">{ctr}%</p>
                    <p className="text-[8px] text-green-400/60 font-bold uppercase tracking-widest mt-1">CTR</p>
                 </div>
              </div>
              {c.budget_amount ? (
                 <div className="mt-4 pt-4 border-t border-white/5">
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest mb-2">
                       <span className="text-white/40">Progresso</span>
                       <span className="text-[#ECA413]">{c.max_impressions ? `${((met.impressions / c.max_impressions) * 100).toFixed(0)}%` : 'Sem Meta'}</span>
                    </div>
                    {c.max_impressions && (
                      <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                         <div className="bg-[#ECA413] h-full" style={{ width: `${Math.min((met.impressions / c.max_impressions) * 100, 100)}%` }} />
                      </div>
                    )}
                 </div>
              ) : null}
            </div>
           );
        })}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[300] bg-background-dark overflow-hidden flex flex-col font-display animate-in slide-in-from-bottom duration-300">
      <header className="px-6 py-4 bg-white/5 border-b border-white/10 flex items-center gap-4">
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white/50 hover:text-white border border-white/10 transition-colors">
          <span className="material-icons">close</span>
        </button>
        <div>
          <h1 className="text-xl font-black italic tracking-tighter text-[#ECA413] uppercase leading-none">Mídia Interna</h1>
          <p className="text-[10px] text-white/40 uppercase tracking-widest font-black mt-1">Ad Manager Enterprise</p>
        </div>
      </header>

      <div className="flex justify-center border-b border-white/5">
        <div className="flex gap-8">
          {['DASHBOARD', 'LIST'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab as any)} className={`py-4 text-[10px] uppercase font-black tracking-widest border-b-2 transition-all ${activeTab === tab || (activeTab === 'FORM' && tab === 'LIST') ? 'border-[#ECA413] text-[#ECA413]' : 'border-transparent text-white/30'}`}>
              {tab === 'LIST' ? 'Gerenciador' : 'Analytics'}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 overflow-y-auto">
        {activeTab === 'DASHBOARD' && renderDashboard()}
        {activeTab === 'LIST' && renderList()}
        {activeTab === 'FORM' && renderForm()}
      </main>
    </div>
  );
};
