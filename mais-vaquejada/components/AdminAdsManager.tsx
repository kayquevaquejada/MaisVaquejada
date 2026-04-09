import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface AdminAdsManagerProps {
    user: any;
    onBack: () => void;
}

const AdminAdsManager: React.FC<AdminAdsManagerProps> = ({ user, onBack }) => {
    const [activeSubTab, setActiveSubTab] = useState<'DASHBOARD' | 'ADS' | 'SPONSORS'>('ADS');

    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);

    // Form State
    const [editId, setEditId] = useState<string | null>(null);
    const [detailsAd, setDetailsAd] = useState<any | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartY, setDragStartY] = useState(0);
    const [dragStartOffset, setDragStartOffset] = useState(50);

    const [formData, setFormData] = useState({
        internal_name: '',
        ad_type: 'carrossel_top',
        title: '',
        subtitle: '',
        cta_text: 'VER MAIS',
        action_type: 'external_link',
        action_value: '',
        target_position: 'market_top_carousel',
        duration_seconds: 5,
        status: 'active',
        image_url: '',
        image_offset: 50
    });

    useEffect(() => {
        if (activeSubTab === 'ADS') {
            fetchCampaigns();
        }
    }, [activeSubTab]);

    const fetchCampaigns = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('ads_campaigns')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            setCampaigns(data || []);
        } catch (err) {
            console.error('Erro ao buscar campanhas:', err);
        } finally {
            setLoading(false);
        }
    };

    // Compress image client-side and convert to base64 — no storage needed
    const compressImage = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const objectUrl = URL.createObjectURL(file);

            img.onload = () => {
                const MAX_W = 1200;
                const MAX_H = 500;
                let w = img.width;
                let h = img.height;

                // Scale down proportionally
                if (w > MAX_W) { h = Math.round(h * MAX_W / w); w = MAX_W; }
                if (h > MAX_H) { w = Math.round(w * MAX_H / h); h = MAX_H; }

                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx!.drawImage(img, 0, 0, w, h);

                URL.revokeObjectURL(objectUrl);
                resolve(canvas.toDataURL('image/jpeg', 0.82));
            };

            img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Falha ao carregar imagem')); };
            img.src = objectUrl;
        });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Max 10MB raw file
        if (file.size > 10 * 1024 * 1024) {
            alert('Imagem muito grande! Máximo 10MB.');
            e.target.value = '';
            return;
        }

        setUploadingImage(true);
        try {
            // First try: compress + upload to Supabase Storage
            try {
                const ext = file.name.split('.').pop() || 'jpg';
                const fileName = `ads/${Date.now()}_${Math.random().toString(36).substr(2, 5)}.${ext}`;
                const { error: uploadError } = await supabase.storage
                    .from('vaquejadas')
                    .upload(fileName, file, { upsert: true, contentType: file.type || 'image/jpeg' });

                if (!uploadError) {
                    const { data } = supabase.storage.from('vaquejadas').getPublicUrl(fileName);
                    setFormData(prev => ({ ...prev, image_url: data.publicUrl }));
                    return; // success via storage
                }
                // Storage failed, fall through to base64
                console.warn('Storage upload failed, falling back to base64:', uploadError.message);
            } catch (_) {
                // ignore, fall through
            }

            // Fallback: compress client-side and store as base64 data URL
            const base64 = await compressImage(file);
            setFormData(prev => ({ ...prev, image_url: base64 }));

        } catch (err: any) {
            alert('Erro ao processar imagem: ' + (err?.message || 'Tente uma imagem menor.'));
        } finally {
            setUploadingImage(false);
            e.target.value = '';
        }
    };


    const handleSave = async () => {
        if (!formData.internal_name || !formData.image_url) {
            return alert("O Nome Interno e a Imagem Central são obrigatórios.");
        }

        setSaving(true);
        try {
            const { image_offset, ...dbData } = formData;
            
            let targetArray = [formData.target_position];
            if (formData.target_position === 'all_screens') {
                targetArray = ['market_top_carousel', 'vaquejada_top_carousel', 'app_home_popup'];
            }

            const adDataToSave = {
                ...dbData,
                image_url: dbData.image_url ? `${dbData.image_url.split('?pos=')[0]}?pos=${Math.round(image_offset)}` : '',
                target_screen: targetArray,
            };

            if (editId) {
                const { error } = await supabase.from('ads_campaigns').update(adDataToSave).eq('id', editId);
                if (error) throw error;
                alert("Anúncio atualizado com sucesso!");
            } else {
                adDataToSave.created_by = user?.id;
                const { error } = await supabase.from('ads_campaigns').insert(adDataToSave);
                if (error) throw error;
                alert("Anúncio criado com sucesso!");
            }

            setShowModal(false);
            setEditId(null);
            fetchCampaigns();
            setFormData({
                internal_name: '', ad_type: 'carrossel_top', title: '', subtitle: '', cta_text: 'VER MAIS',
                action_type: 'external_link', action_value: '', target_position: 'market_top_carousel',
                duration_seconds: 5, status: 'active', image_url: '', image_offset: 50
            });

        } catch (err: any) {
            console.error(err);
            alert("Erro ao salvar: " + err.message);
        } finally {
            setSaving(false);
        }
    };
    
    // ... [Render Functions] ...

    const renderHeader = () => (
        <header className="px-6 py-6 border-b border-[#1A1108]/5 flex items-center gap-4 bg-white sticky top-0 z-10 w-full shadow-sm">
            <button onClick={onBack} className="material-icons text-leather active:scale-90 transition-transform">arrow_back</button>
            <div className="flex-1">
                <h2 className="text-xl font-black uppercase italic tracking-tight text-[#D4AF37]">Publicidade</h2>
                <p className="text-[10px] font-black tracking-widest uppercase text-leather/40">Central de Anúncios</p>
            </div>
        </header>
    );

    const renderSubnav = () => (
        <div className="bg-white border-b border-[#1A1108]/5 px-4 flex gap-2 overflow-x-auto hide-scrollbar">
            {['DASHBOARD', 'ADS', 'SPONSORS'].map(tab => (
                <button
                    key={tab}
                    onClick={() => setActiveSubTab(tab as any)}
                    className={`py-4 px-2 whitespace-nowrap text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${
                        activeSubTab === tab ? 'border-[#D4AF37] text-[#D4AF37]' : 'border-transparent text-leather/40'
                    }`}
                >
                    {tab === 'ADS' ? 'Anúncios' : tab === 'DASHBOARD' ? 'Métricas' : 'Patrocinadores'}
                </button>
            ))}
        </div>
    );

    const renderAdsList = () => (
        <div className="p-6 space-y-4">
            <div className="flex justify-between items-center mb-2">
                <h3 className="font-black text-sm uppercase tracking-wide text-leather">Campanhas Ativas</h3>
                <button onClick={() => {
                    setEditId(null);
                    setFormData({
                        internal_name: '', ad_type: 'carrossel_top', title: '', subtitle: '', cta_text: 'VER MAIS',
                        action_type: 'external_link', action_value: '', target_position: 'market_top_carousel',
                        duration_seconds: 5, status: 'active', image_url: '', image_offset: 50
                    });
                    setShowModal(true);
                }} className="bg-[#D4AF37] text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[#D4AF37]/20 active:scale-95">
                    Novo Anúncio
                </button>
            </div>

            {loading ? (
                <div className="py-20 flex flex-col items-center justify-center opacity-40">
                    <div className="w-8 h-8 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-[10px] font-black uppercase tracking-widest">Carregando...</p>
                </div>
            ) : campaigns.length === 0 ? (
                <div className="bg-white p-8 rounded-[24px] border border-[#1A1108]/5 text-center shadow-sm">
                    <span className="material-icons text-4xl text-leather/20 mb-3 block">campaign</span>
                    <p className="font-bold text-sm text-leather/60">Nenhuma campanha cadastrada.</p>
                </div>
            ) : (
                campaigns.map(ad => (
                    <div key={ad.id} className="bg-white p-4 rounded-[24px] border border-[#1A1108]/5 shadow-sm flex items-center gap-4">
                        <div className="w-16 h-16 rounded-xl bg-neutral-100 overflow-hidden shrink-0 border border-black/5">
                            {ad.image_url ? (
                                <img src={ad.image_url} alt="Ad Thumbnail" className="w-full h-full object-cover" />
                            ) : (
                                <span className="material-icons text-leather/20 w-full h-full flex items-center justify-center">image</span>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-[#D4AF37]/10 text-[#D4AF37]">{ad.target_position || 'Geral'}</span>
                                <span className={`text-[8px] font-black uppercase tracking-widest ${ad.status === 'active' ? 'text-green-500' : 'text-leather/40'}`}>
                                    {ad.status}
                                </span>
                            </div>
                            <h4 className="font-black text-sm truncate">{ad.internal_name}</h4>
                            <p className="text-[10px] font-bold text-leather/40 truncate">{ad.title || 'Sem título visual'}</p>
                            <p className="text-[8px] font-bold text-leather/30 mt-1 uppercase tracking-widest">
                                Atualizado: {new Date(ad.created_at).toLocaleDateString('pt-BR')} 
                            </p>
                        </div>
                        <div className="flex flex-col gap-2">
                           <button onClick={(e) => { e.stopPropagation(); setDetailsAd(ad); }} className="material-icons text-blue-400 text-lg active:scale-95">info</button>
                           <button onClick={async (e) => {
                               e.stopPropagation();
                               if(confirm('Pausar campanha?')) {
                                   await supabase.from('ads_campaigns').update({status: ad.status === 'active' ? 'paused' : 'active'}).eq('id', ad.id);
                                   fetchCampaigns();
                               }
                           }} className="material-icons text-leather/40 text-lg active:scale-95">{ad.status === 'active' ? 'pause_circle' : 'play_circle'}</button>
                           
                           <button onClick={() => {
                               let extractedOffset = 50;
                               if(ad.image_url?.includes('?pos=')) extractedOffset = Number(ad.image_url.split('?pos=')[1]);
                               
                               let mappedPosition = 'market_top_carousel';
                               if (Array.isArray(ad.target_screen) && ad.target_screen.length > 1) {
                                   mappedPosition = 'all_screens';
                               } else if (Array.isArray(ad.target_screen) && ad.target_screen.length === 1) {
                                   mappedPosition = ad.target_screen[0];
                               }

                               setFormData({
                                   internal_name: ad.internal_name || '',
                                   ad_type: ad.ad_type || 'carrossel_top',
                                   title: ad.title || '',
                                   subtitle: ad.subtitle || '',
                                   cta_text: ad.cta_text || 'VER MAIS',
                                   action_type: ad.action_type || 'external_link',
                                   action_value: ad.action_value || '',
                                   target_position: mappedPosition,
                                   duration_seconds: ad.duration_seconds || 5,
                                   status: ad.status || 'active',
                                   image_url: ad.image_url || '',
                                   image_offset: extractedOffset
                               });
                               setEditId(ad.id);
                               setShowModal(true);
                           }} className="material-icons text-[#D4AF37] text-lg active:scale-95">edit</button>

                           <button onClick={async (e) => {
                               e.stopPropagation();
                               if(confirm('Excluir anúncio permanentemente?')) {
                                   await supabase.from('ads_campaigns').delete().eq('id', ad.id);
                                   fetchCampaigns();
                               }
                           }} className="material-icons text-red-400 text-lg active:scale-95">delete</button>
                        </div>
                    </div>
                ))
            )}
        </div>
    );

    const renderModal = () => {
        if (!showModal) return null;
        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[300] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
                <div className="bg-[#F8F5F2] w-full max-w-lg rounded-t-[32px] sm:rounded-[32px] max-h-[90vh] flex flex-col shadow-2xl relative animate-in slide-in-from-bottom-8">
                    
                    <div className="p-6 border-b border-[#1A1108]/5 flex items-center justify-between bg-white rounded-t-[32px]">
                        <div>
                            <h2 className="text-xl font-black italic tracking-tight text-[#D4AF37]">{editId ? 'EDITAR ANÚNCIO' : 'NOVO ANÚNCIO'}</h2>
                            <p className="text-[10px] font-black tracking-widest uppercase text-leather/40">Central de Publicidade</p>
                        </div>
                        <button onClick={() => setShowModal(false)} className="w-10 h-10 bg-neutral-100 rounded-full flex items-center justify-center text-leather/60">
                            <span className="material-icons">close</span>
                        </button>
                    </div>

                    <div className="p-6 overflow-y-auto space-y-8 pb-32">
                        
                        {/* Bloco 1: Identificação */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black tracking-widest uppercase text-[#D4AF37] border-b border-[#1A1108]/5 pb-2">1. Identificação</h3>
                            <input type="text" placeholder="Nome Interno (ex: Banner Haras PFF)" value={formData.internal_name} onChange={e => setFormData({...formData, internal_name: e.target.value})} className="w-full bg-white px-5 py-4 rounded-xl border border-[#1A1108]/10 text-sm font-bold text-leather placeholder:text-leather/30 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none" />
                        </div>

                        {/* Bloco 2: Mídia */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black tracking-widest uppercase text-[#D4AF37] border-b border-[#1A1108]/5 pb-2">2. Conteúdo Visual</h3>
                            <div className="space-y-3">
                                {formData.image_url ? (
                                    <div className="relative w-full h-32 rounded-[20px] overflow-hidden bg-neutral-100 shadow-inner group">
                                        {/* Pan Interactive Overlay */}
                                        <div 
                                            className={`absolute inset-0 z-10 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                                            onMouseDown={(e) => { e.preventDefault(); setIsDragging(true); setDragStartY(e.clientY); setDragStartOffset(formData.image_offset || 50); }}
                                            onMouseMove={(e) => {
                                                if(!isDragging) return;
                                                const delta = e.clientY - dragStartY;
                                                let newOffset = dragStartOffset - (delta / 1.5);
                                                if(newOffset < 0) newOffset = 0;
                                                if(newOffset > 100) newOffset = 100;
                                                setFormData({...formData, image_offset: newOffset});
                                            }}
                                            onMouseUp={() => setIsDragging(false)}
                                            onMouseLeave={() => setIsDragging(false)}
                                            
                                            onTouchStart={(e) => { setIsDragging(true); setDragStartY(e.touches[0].clientY); setDragStartOffset(formData.image_offset || 50); }}
                                            onTouchMove={(e) => {
                                                if(!isDragging) return;
                                                const delta = e.touches[0].clientY - dragStartY;
                                                let newOffset = dragStartOffset - (delta / 1.5);
                                                if(newOffset < 0) newOffset = 0;
                                                if(newOffset > 100) newOffset = 100;
                                                setFormData({...formData, image_offset: newOffset});
                                            }}
                                            onTouchEnd={() => setIsDragging(false)}
                                        ></div>

                                        <img 
                                            draggable={false}
                                            src={formData.image_url.split('?pos=')[0]} 
                                            className="w-full h-full object-cover pointer-events-none select-none" 
                                            style={{ objectPosition: `center ${Math.round(formData.image_offset || 50)}%` }} 
                                            alt="Preview"
                                        />
                                        
                                        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md rounded-full px-2 py-1 flex items-center pointer-events-none z-20">
                                            <span className="material-icons text-white text-[10px] mr-1">swipe_vertical</span>
                                            <span className="text-white text-[8px] font-black tracking-widest">ARRASTE</span>
                                        </div>
                                        
                                        <button 
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFormData({...formData, image_url: '', image_offset: 50}); }}
                                            className="absolute bottom-2 right-2 bg-red-500/80 hover:bg-red-500 backdrop-blur-md rounded-full w-8 h-8 flex items-center justify-center pointer-events-auto z-30 transition-colors shadow-lg active:scale-90"
                                        >
                                            <span className="material-icons text-white text-sm">delete</span>
                                        </button>
                                    </div>
                                ) : (
                                    <label className="w-full h-32 rounded-[20px] border-2 border-dashed border-[#1A1108]/20 bg-black/5 hover:bg-black/10 cursor-pointer flex flex-col items-center justify-center transition-all">
                                        {uploadingImage ? (
                                            <div className="text-center"><div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto mb-2" /><span className="text-[10px] font-black uppercase text-leather/60">Enviando...</span></div>
                                        ) : (
                                            <div className="text-center opacity-40">
                                                <span className="material-icons text-3xl mb-1 text-leather">add_photo_alternate</span>
                                                <p className="text-[10px] text-leather font-black tracking-widest uppercase">Anexar Bandeira</p>
                                                <p className="text-[8px] text-leather/80 font-bold mt-1 leading-tight">1200 x 400px (3:1)</p>
                                            </div>
                                        )}
                                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                    </label>
                                )}
                            </div>

                            <input type="text" placeholder="Título que aparece no banner (Opcional)" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-white px-5 py-4 rounded-xl border border-[#1A1108]/10 text-sm font-bold text-leather placeholder:text-leather/30" />
                            <input type="text" placeholder="Texto do Botão (Ex: VER OFERTA)" value={formData.cta_text} onChange={e => setFormData({...formData, cta_text: e.target.value})} className="w-full bg-white px-5 py-4 rounded-xl border border-[#1A1108]/10 text-sm font-bold text-leather placeholder:text-leather/30" />
                        </div>

                        {/* Bloco 3: Destino */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black tracking-widest uppercase text-[#D4AF37] border-b border-[#1A1108]/5 pb-2">3. Ação do Botão</h3>
                            <select value={formData.action_type} onChange={e => setFormData({...formData, action_type: e.target.value})} className="w-full bg-white px-5 py-4 rounded-xl border border-[#1A1108]/10 text-sm font-bold text-leather outline-none">
                                <option value="external_link">Abrir Link Externo (Site)</option>
                                <option value="whatsapp">Abrir WhatsApp</option>
                                <option value="none">Apenas Exibição Visual (Sem clique)</option>
                            </select>
                            {formData.action_type !== 'none' && (
                                <input type="text" placeholder={formData.action_type === 'whatsapp' ? 'DDD + Número' : 'Cole a URL (https://...)'} value={formData.action_value} onChange={e => setFormData({...formData, action_value: e.target.value})} className="w-full bg-white px-5 py-4 rounded-xl border border-[#1A1108]/10 text-sm font-bold text-leather placeholder:text-leather/30" />
                            )}
                        </div>


                        {/* Bloco 4: Configuração */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black tracking-widest uppercase text-[#D4AF37] border-b border-[#1A1108]/5 pb-2">4. Posição e Regras</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black tracking-widest uppercase text-leather/60">Onde exibir?</label>
                                    <select value={formData.target_position} onChange={e => setFormData({...formData, target_position: e.target.value})} className="w-full bg-white px-4 py-3 rounded-xl border border-[#1A1108]/10 text-[11px] font-bold text-leather outline-none">
                                        <option value="all_screens">Em Todas as Telas (Full Patrocínio)</option>
                                        <option value="market_top_carousel">Somente Mercado (Topo)</option>
                                        <option value="vaquejada_top_carousel">Somente Vaquejadas (Topo)</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black tracking-widest uppercase text-leather/60">Tempo no Carrossel</label>
                                    <select value={formData.duration_seconds} onChange={e => setFormData({...formData, duration_seconds: Number(e.target.value)})} className="w-full bg-white px-4 py-3 rounded-xl border border-[#1A1108]/10 text-[11px] font-bold text-leather outline-none">
                                        <option value={3}>3 Segundos</option>
                                        <option value={5}>5 Segundos</option>
                                        <option value={8}>8 Segundos</option>
                                        <option value={15}>15 Segundos</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#F8F5F2] via-[#F8F5F2] to-transparent pt-12">
                        <button disabled={saving || uploadingImage} onClick={handleSave} className="w-full bg-[#1A1108] text-white font-black py-4 rounded-xl uppercase tracking-widest shadow-xl disabled:opacity-50 flex items-center justify-center gap-2">
                            {saving ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"/> : <span className="material-icons">{editId ? 'save' : 'rocket_launch'}</span>}
                            {saving ? 'Salvando...' : (editId ? 'Salvar Edição' : 'Publicar Campanha')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="absolute inset-0 bg-[#F5F1E9] flex flex-col animate-in slide-in-from-right duration-300 z-[200]">
            {renderHeader()}
            {renderSubnav()}
            
            <div className="flex-1 overflow-y-auto pb-24">
                {activeSubTab === 'ADS' && renderAdsList()}
                {activeSubTab === 'DASHBOARD' && (
                    <div className="p-6 text-center text-leather/40 py-20 font-bold text-sm">Dashboard em construção...</div>
                )}
                {activeSubTab === 'SPONSORS' && (
                    <div className="p-6 text-center text-leather/40 py-20 font-bold text-sm">Patrocinadores em construção...</div>
                )}
            </div>

            {renderModal()}
            
            {/* Modal de Detalhes da Autoria/Criação */}
            {detailsAd && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[400] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl relative animate-in zoom-in-95">
                        <button onClick={() => setDetailsAd(null)} className="absolute top-4 right-4 w-8 h-8 bg-neutral-100 rounded-full flex items-center justify-center text-leather/60 active:scale-90 shadow-sm border border-black/5">
                            <span className="material-icons text-sm">close</span>
                        </button>
                        
                        <div className="mb-6 flex flex-col items-center">
                            <div className="w-16 h-16 bg-[#D4AF37]/10 rounded-full flex items-center justify-center mb-3">
                                <span className="material-icons text-[#D4AF37] text-3xl">receipt_long</span>
                            </div>
                            <h2 className="text-lg font-black italic tracking-tight text-[#D4AF37]">DETALHES DO ANÚNCIO</h2>
                            <p className="text-[10px] font-black tracking-widest uppercase text-leather/40 text-center">Registro de Criação</p>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-[#F5F1E9] p-4 rounded-xl border border-leather/5">
                                <p className="text-[9px] font-black tracking-widest uppercase text-leather/50 mb-1">ID da Campanha</p>
                                <p className="text-[10px] font-black text-leather font-mono break-all">{detailsAd.id}</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-[#F5F1E9] p-4 rounded-xl border border-leather/5">
                                    <p className="text-[9px] font-black tracking-widest uppercase text-leather/50 mb-1">Data de Emissão</p>
                                    <p className="text-xs font-black text-leather">{new Date(detailsAd.created_at).toLocaleDateString('pt-BR')}</p>
                                </div>
                                <div className="bg-[#F5F1E9] p-4 rounded-xl border border-leather/5">
                                    <p className="text-[9px] font-black tracking-widest uppercase text-leather/50 mb-1">Hora de Emissão</p>
                                    <p className="text-xs font-black text-leather">{new Date(detailsAd.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                                </div>
                            </div>

                            <div className="bg-[#F5F1E9] p-4 rounded-xl border border-leather/5">
                                <p className="text-[9px] font-black tracking-widest uppercase text-leather/50 mb-1">Publicado Por</p>
                                <p className="text-[10px] font-black text-leather font-mono break-all line-clamp-1">{detailsAd.created_by || 'Sistema Automático'}</p>
                                {detailsAd.created_by === user?.id && <div className="mt-2 inline-block bg-green-500/10 text-green-600 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">Sua Conta</div>}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminAdsManager;
