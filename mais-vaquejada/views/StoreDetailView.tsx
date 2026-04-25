import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { View as ViewType } from '../types';

interface StoreDetailViewProps {
    store: any;
    user: any;
    onBack: () => void;
}

const StoreDetailView: React.FC<StoreDetailViewProps> = ({ store, user, onBack }) => {
    const [activeTab, setActiveTab] = useState<'products' | 'about' | 'reviews'>('products');
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState('all');
    const [isFollowed, setIsFollowed] = useState(false);
    const [showAddProduct, setShowAddProduct] = useState(false);
    const [showEditStore, setShowEditStore] = useState(false);

    useEffect(() => {
        if (store?.id) {
            fetchProducts();
            checkIfFollowed();
        }
    }, [store?.id]);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('produtos_loja')
                .select('*')
                .eq('loja_id', store.id)
                .eq('ativo', true)
                .order('ordem', { ascending: true });

            if (error) throw error;
            setProducts(data || []);
        } catch (err) {
            console.error('Error fetching store products:', err);
        } finally {
            setLoading(false);
        }
    };

    const toggleProductVisibility = async (product: any) => {
        try {
            const { error } = await supabase
                .from('produtos_loja')
                .update({ ativo: !product.ativo })
                .eq('id', product.id);
            if (error) throw error;
            fetchProducts();
        } catch (err) {
            console.error('Error toggling product visibility:', err);
        }
    };

    const deleteProduct = async (id: string) => {
        if (!confirm('Deseja excluir este produto permanentemente?')) return;
        try {
            const { error } = await supabase
                .from('produtos_loja')
                .delete()
                .eq('id', id);
            if (error) throw error;
            fetchProducts();
        } catch (err) {
            console.error('Error deleting product:', err);
        }
    };

    const checkIfFollowed = async () => {
        // Placeholder for follow logic if exists in future
        setIsFollowed(false);
    };

    const categories = useMemo(() => {
        const cats = products.map(p => p.categoria).filter(Boolean);
        return ['all', ...Array.from(new Set(cats))];
    }, [products]);

    const filteredProducts = useMemo(() => {
        if (activeCategory === 'all') return products;
        return products.filter(p => p.categoria === activeCategory);
    }, [products, activeCategory]);

    const handleWhatsApp = () => {
        const phone = store.whatsapp || store.contact_whatsapp;
        if (!phone) return alert('Loja sem WhatsApp cadastrado.');
        const cleanPhone = phone.replace(/\D/g, '');
        window.open(`https://wa.me/${cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone}`, '_blank');
    };

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: store.nome || store.name,
                text: `Confira a loja ${store.nome || store.name} no +Vaquejada!`,
                url: window.location.href
            });
        } else {
            alert('Link copiado!');
        }
    };

    if (!store) return null;

    return (
        <div className="min-h-screen bg-[#F5F1E9] flex flex-col animate-in fade-in slide-in-from-right duration-300">
            {/* 1. HEADER DA LOJA */}
            <div className="relative">
                {/* Banner Capa */}
                <div className="h-[200px] w-full relative bg-neutral-800">
                    <img 
                        src={store.banner_url || store.cover_url || 'https://images.unsplash.com/photo-1598970434795-0c54fe7c0648?auto=format&fit=crop&w=1200&q=80'} 
                        className="w-full h-full object-cover" 
                        alt="Banner Loja"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    
                    {/* Botão Voltar */}
                    <button 
                        onClick={onBack}
                        className="absolute top-12 left-6 w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white z-20 active:scale-90"
                    >
                        <span className="material-icons">arrow_back</span>
                    </button>

                    {/* Botão Configurações da Loja (Apenas Dono) */}
                    {user?.id === store.user_id && (
                        <button 
                            onClick={() => setShowEditStore(true)}
                            className="absolute top-12 right-6 w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white z-20 active:scale-90"
                        >
                            <span className="material-icons">settings</span>
                        </button>
                    )}
                </div>

                {/* Identidade da Loja (Overlay) */}
                <div className="absolute -bottom-16 left-6 right-6 flex items-end gap-4 z-10">
                    <div className="w-24 h-24 rounded-full border-4 border-[#F5F1E9] bg-white overflow-hidden shadow-xl shrink-0">
                        <img 
                            src={store.logo_url || 'https://via.placeholder.com/150'} 
                            className="w-full h-full object-cover" 
                            alt={store.nome || store.name}
                        />
                    </div>
                    <div className="pb-2 flex-1">
                        <div className="flex items-center gap-1">
                            <h1 className="text-xl font-black text-white drop-shadow-md uppercase italic leading-none">{store.nome || store.name}</h1>
                            {(store.verificado || store.is_official) && (
                                <span className="material-icons text-blue-400 text-lg">verified</span>
                            )}
                        </div>
                        <p className="text-[10px] font-bold text-white/80 uppercase tracking-widest mt-1">
                            <span className="material-icons text-[10px] mr-1">place</span>
                            {store.cidade || store.city || 'Brasil'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Espaçador para o logo que transborda */}
            <div className="h-20" />

            {/* 2. AÇÕES RÁPIDAS (Removido conforme solicitado) */}

            {/* 3. MENU DE NAVEGAÇÃO (TABS) */}
            <div className="sticky top-0 z-30 bg-[#F5F1E9]/80 backdrop-blur-xl border-b border-[#1A1108]/5">
                <div className="flex px-6">
                    {(['products', 'about', 'reviews'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-4 text-[11px] font-black uppercase tracking-widest transition-all relative ${
                                activeTab === tab ? 'text-[#D4AF37]' : 'text-[#1A1108]/40'
                            }`}
                        >
                            {tab === 'products' ? 'Produtos' : tab === 'about' ? 'Sobre' : 'Avaliações'}
                            {activeTab === tab && (
                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-[#D4AF37] rounded-full" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* CONTEÚDO DAS ABAS */}
            <div className="flex-1">
                {activeTab === 'products' && (
                    <div className="animate-in fade-in duration-500">
                        {/* A. FILTROS DE CATEGORIA */}
                        <div className="px-6 py-4 overflow-x-auto hide-scrollbar flex gap-2">
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    className={`px-4 py-2 rounded-full text-[10px] font-black uppercase whitespace-nowrap transition-all ${
                                        activeCategory === cat 
                                        ? 'bg-[#D4AF37] text-white shadow-lg shadow-[#D4AF37]/20' 
                                        : 'bg-white border border-[#1A1108]/10 text-[#1A1108]/60'
                                    }`}
                                >
                                    {cat === 'all' ? 'Todos' : cat}
                                </button>
                            ))}
                        </div>

                        {/* B. GRID DE PRODUTOS */}
                        <div className="px-6 pb-24">
                            {loading ? (
                                <div className="grid grid-cols-2 gap-4">
                                    {[1,2,3,4].map(i => (
                                        <div key={i} className="aspect-[3/4] bg-white rounded-3xl animate-pulse border border-[#1A1108]/5" />
                                    ))}
                                </div>
                            ) : filteredProducts.length > 0 ? (
                                <div className="grid grid-cols-2 gap-4">
                                    {filteredProducts.map(product => (
                                        <div 
                                            key={product.id}
                                            className="bg-white rounded-3xl overflow-hidden shadow-sm border border-[#1A1108]/5 flex flex-col group active:scale-95 transition-transform"
                                        >
                                            <div className="aspect-square relative overflow-hidden bg-neutral-100">
                                                <img 
                                                    src={product.imagem_url || 'https://via.placeholder.com/300'} 
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                    alt={product.nome}
                                                />
                                                {product.destaque && (
                                                    <div className="absolute top-3 left-3 bg-[#D4AF37] text-white text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest shadow-lg">
                                                        Destaque
                                                    </div>
                                                )}
                                            </div>
                                                <div className="mt-2 flex items-center justify-between">
                                                    <div className="flex items-center gap-1 opacity-40">
                                                        <span className="material-icons text-[10px]">category</span>
                                                        <span className="text-[8px] font-bold uppercase">{product.categoria}</span>
                                                    </div>
                                                    
                                                    {/* Ações do Dono no Produto */}
                                                    {user?.id === store.user_id && (
                                                        <div className="flex gap-2">
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); toggleProductVisibility(product); }}
                                                                className={`w-6 h-6 rounded-full flex items-center justify-center ${product.ativo ? 'text-blue-500' : 'text-gray-400'}`}
                                                            >
                                                                <span className="material-icons text-sm">{product.ativo ? 'visibility' : 'visibility_off'}</span>
                                                            </button>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); deleteProduct(product.id); }}
                                                                className="w-6 h-6 rounded-full flex items-center justify-center text-red-500"
                                                            >
                                                                <span className="material-icons text-sm">delete</span>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-20 flex flex-col items-center justify-center text-center opacity-20">
                                    <span className="material-icons text-6xl mb-4">inventory_2</span>
                                    <p className="text-sm font-black uppercase tracking-widest">Nenhum produto cadastrado</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'about' && (
                    <div className="p-6 space-y-8 animate-in fade-in duration-500">
                        {/* Descrição */}
                        <div>
                            <h3 className="text-xs font-black text-[#1A1108] uppercase tracking-[0.2em] mb-4 border-l-4 border-[#D4AF37] pl-3">Nossa História</h3>
                            <p className="text-sm text-[#1A1108]/70 leading-relaxed font-medium">
                                {store.descricao || store.description || 'Nenhuma descrição informada pela loja.'}
                            </p>
                        </div>

                        {/* Contatos */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-[#1A1108] uppercase tracking-[0.2em] mb-4 border-l-4 border-[#D4AF37] pl-3">Canais de Contato</h3>
                            
                            <div className="bg-white p-4 rounded-2xl border border-[#1A1108]/5 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-green-50 text-green-500 flex items-center justify-center">
                                    <span className="material-icons">whatsapp</span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-[9px] font-black text-[#1A1108]/40 uppercase tracking-widest">WhatsApp</p>
                                    <p className="text-sm font-bold text-[#1A1108]">{store.whatsapp || store.contact_whatsapp || 'Não informado'}</p>
                                </div>
                                <button onClick={handleWhatsApp} className="text-[10px] font-black text-[#D4AF37] uppercase underline">Chamar</button>
                            </div>

                            <div className="bg-white p-4 rounded-2xl border border-[#1A1108]/5 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-500 flex items-center justify-center">
                                    <span className="material-icons">camera_alt</span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-[9px] font-black text-[#1A1108]/40 uppercase tracking-widest">Instagram</p>
                                    <p className="text-sm font-bold text-[#1A1108]">@{store.instagram || store.contact_instagram || 'maisvaquejada'}</p>
                                </div>
                                <button onClick={() => window.open(`https://instagram.com/${store.instagram || store.contact_instagram}`, '_blank')} className="text-[10px] font-black text-[#D4AF37] uppercase underline">Seguir</button>
                            </div>

                            <div className="bg-white p-4 rounded-2xl border border-[#1A1108]/5 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center">
                                    <span className="material-icons">place</span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-[9px] font-black text-[#1A1108]/40 uppercase tracking-widest">Localização</p>
                                    <p className="text-sm font-bold text-[#1A1108]">{store.cidade || store.city}, {store.estado || store.state || 'Brasil'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'reviews' && (
                    <div className="p-10 flex flex-col items-center justify-center text-center animate-in fade-in duration-500">
                        <div className="w-20 h-20 bg-yellow-50 rounded-full flex items-center justify-center mb-6">
                            <span className="material-icons text-yellow-400 text-4xl">star</span>
                        </div>
                        <h3 className="text-lg font-black text-[#1A1108] uppercase mb-2">Avaliações em Breve</h3>
                        <p className="text-sm text-[#1A1108]/40 font-bold max-w-[240px]">Estamos preparando um sistema de confiança para você avaliar suas compras.</p>
                        
                        <div className="mt-8 grid grid-cols-5 gap-2 opacity-20">
                            {[1,2,3,4,5].map(i => <span key={i} className="material-icons text-3xl">star_border</span>)}
                        </div>
                    </div>
                )}
            </div>

            {/* Botão WhatsApp Flutuante Removido */}
            
            {/* Botão Adicionar Produto (Apenas para o Dono da Loja) */}
            {user?.id === store.user_id && (
                <button 
                    onClick={() => setShowAddProduct(true)}
                    className="fixed bottom-24 right-6 w-16 h-16 bg-[#1A1108] text-white rounded-full flex items-center justify-center shadow-2xl z-50 active:scale-90 transition-transform"
                >
                    <span className="material-icons text-3xl">add</span>
                </button>
            )}
            {/* Modal de Cadastro de Produto */}
            {showAddProduct && (
                <AddProductModal 
                    storeId={store.id} 
                    onClose={() => setShowAddProduct(false)} 
                    onSuccess={() => {
                        setShowAddProduct(false);
                        fetchProducts();
                    }}
                />
            )}

            {/* Modal de Configurações da Loja */}
            {showEditStore && (
                <EditStoreModal 
                    store={store} 
                    onClose={() => setShowEditStore(false)} 
                    onSuccess={() => {
                        setShowEditStore(false);
                        window.location.reload(); // Simplest way to refresh store data in this context
                    }}
                />
            )}
        </div>
    );
};

// Componente Interno para Editar Loja
const EditStoreModal: React.FC<{ store: any, onClose: () => void, onSuccess: () => void }> = ({ store, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        nome: store.nome || '',
        cidade: store.cidade || '',
        logo_url: store.logo_url || '',
        banner_url: store.banner_url || '',
        descricao: store.descricao || '',
        whatsapp: store.whatsapp || '',
        instagram: store.instagram || '',
        ativo: store.ativo ?? true
    });

    const handleSave = async () => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('lojas')
                .update(formData)
                .eq('id', store.id);
            if (error) throw error;
            onSuccess();
        } catch (err: any) {
            alert('Erro ao salvar: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('ATENÇÃO: Isso excluirá sua loja e todos os produtos permanentemente. Tem certeza?')) return;
        setLoading(true);
        try {
            const { error } = await supabase.from('lojas').delete().eq('id', store.id);
            if (error) throw error;
            window.dispatchEvent(new CustomEvent('arena_navigate', { detail: { view: 'MERCADO' } }));
        } catch (err: any) {
            alert('Erro ao excluir: ' + err.message);
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-6 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-lg rounded-t-[40px] md:rounded-[40px] p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-black uppercase italic text-[#1A1108]">Configurações da Loja</h2>
                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-[#1A1108]/5 flex items-center justify-center">
                        <span className="material-icons">close</span>
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-black uppercase text-[#1A1108]/40 mb-2 block">Nome da Loja</label>
                        <input value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} className="w-full p-4 rounded-2xl border border-[#1A1108]/10 font-bold" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black uppercase text-[#1A1108]/40 mb-2 block">Logo (URL)</label>
                            <input value={formData.logo_url} onChange={e => setFormData({...formData, logo_url: e.target.value})} className="w-full p-4 rounded-2xl border border-[#1A1108]/10 font-bold" placeholder="Circular" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-[#1A1108]/40 mb-2 block">Capa/Banner (URL)</label>
                            <input value={formData.banner_url} onChange={e => setFormData({...formData, banner_url: e.target.value})} className="w-full p-4 rounded-2xl border border-[#1A1108]/10 font-bold" placeholder="Recomendado: 1200x400px" />
                            <p className="text-[8px] text-[#D4AF37] font-bold mt-1 uppercase">Ideal: 1200x400px para melhor encaixe</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black uppercase text-[#1A1108]/40 mb-2 block">WhatsApp</label>
                            <input value={formData.whatsapp} onChange={e => setFormData({...formData, whatsapp: e.target.value})} className="w-full p-4 rounded-2xl border border-[#1A1108]/10 font-bold" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-[#1A1108]/40 mb-2 block">Cidade/UF</label>
                            <input value={formData.cidade} onChange={e => setFormData({...formData, cidade: e.target.value})} className="w-full p-4 rounded-2xl border border-[#1A1108]/10 font-bold" />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase text-[#1A1108]/40 mb-2 block">Descrição</label>
                        <textarea value={formData.descricao} onChange={e => setFormData({...formData, descricao: e.target.value})} className="w-full p-4 rounded-2xl border border-[#1A1108]/10 font-medium" rows={3} />
                    </div>

                    <div className="flex items-center justify-between bg-neutral-50 p-4 rounded-2xl">
                        <div className="flex items-center gap-3">
                            <input type="checkbox" checked={formData.ativo} onChange={e => setFormData({...formData, ativo: e.target.checked})} className="w-5 h-5 accent-[#D4AF37]" />
                            <span className="text-xs font-bold uppercase text-[#1A1108]">Loja Ativa (Visível)</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-3 pt-4">
                    <button onClick={handleSave} disabled={loading} className="w-full h-16 bg-[#1A1108] text-white rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 disabled:opacity-50">
                        {loading ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                    <button onClick={handleDelete} disabled={loading} className="w-full py-4 text-red-500 font-black uppercase text-[10px] tracking-widest active:scale-95">
                        Excluir Loja Permanentemente
                    </button>
                </div>
            </div>
        </div>
    );
};

// Componente Interno para Cadastro de Produto
const AddProductModal: React.FC<{ storeId: string, onClose: () => void, onSuccess: () => void }> = ({ storeId, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        nome: '',
        preco: '',
        categoria: '',
        imagem_url: '',
        descricao: '',
        destaque: false
    });

    const handleSave = async () => {
        if (!formData.nome || !formData.categoria) return alert('Nome e Categoria são obrigatórios');
        setLoading(true);
        try {
            const { error } = await supabase
                .from('produtos_loja')
                .insert([{
                    ...formData,
                    loja_id: storeId,
                    ativo: true
                }]);
            if (error) throw error;
            onSuccess();
        } catch (err: any) {
            alert('Erro ao salvar: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-6 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-lg rounded-t-[40px] md:rounded-[40px] p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-black uppercase italic text-[#1A1108]">Novo Produto</h2>
                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-[#1A1108]/5 flex items-center justify-center">
                        <span className="material-icons">close</span>
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-black uppercase text-[#1A1108]/40 mb-2 block">Nome do Produto</label>
                        <input 
                            value={formData.nome}
                            onChange={e => setFormData({...formData, nome: e.target.value})}
                            className="w-full p-4 rounded-2xl border border-[#1A1108]/10 font-bold"
                            placeholder="Ex: Sela Australiana"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black uppercase text-[#1A1108]/40 mb-2 block">Preço</label>
                            <input 
                                value={formData.preco}
                                onChange={e => setFormData({...formData, preco: e.target.value})}
                                className="w-full p-4 rounded-2xl border border-[#1A1108]/10 font-bold"
                                placeholder="Ex: R$ 450,00"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-[#1A1108]/40 mb-2 block">Categoria</label>
                            <input 
                                value={formData.categoria}
                                onChange={e => setFormData({...formData, categoria: e.target.value})}
                                className="w-full p-4 rounded-2xl border border-[#1A1108]/10 font-bold"
                                placeholder="Ex: Acessórios"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase text-[#1A1108]/40 mb-2 block">URL da Imagem</label>
                        <input 
                            value={formData.imagem_url}
                            onChange={e => setFormData({...formData, imagem_url: e.target.value})}
                            className="w-full p-4 rounded-2xl border border-[#1A1108]/10 font-bold"
                            placeholder="Link da foto do produto"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase text-[#1A1108]/40 mb-2 block">Descrição Curta</label>
                        <textarea 
                            value={formData.descricao}
                            onChange={e => setFormData({...formData, descricao: e.target.value})}
                            className="w-full p-4 rounded-2xl border border-[#1A1108]/10 font-medium"
                            rows={3}
                        />
                    </div>
                    <div className="flex items-center gap-3 bg-neutral-50 p-4 rounded-2xl">
                        <input 
                            type="checkbox"
                            checked={formData.destaque}
                            onChange={e => setFormData({...formData, destaque: e.target.checked})}
                            className="w-5 h-5 accent-[#D4AF37]"
                        />
                        <span className="text-xs font-bold uppercase text-[#1A1108]">Destacar este produto</span>
                    </div>
                </div>

                <button 
                    onClick={handleSave}
                    disabled={loading}
                    className="w-full h-16 bg-[#1A1108] text-white rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 disabled:opacity-50"
                >
                    {loading ? 'Salvando...' : 'Cadastrar Produto'}
                </button>
            </div>
        </div>
    );
};

export default StoreDetailView;
