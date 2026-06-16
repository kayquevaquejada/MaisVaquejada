import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { User } from '../../types';
import { AuctionUser } from '../types';
import { createNotification } from '../../lib/notifications';
import { Capacitor } from '@capacitor/core';

interface AdminPanelProps {
    user: User;
    auctionUser: AuctionUser;
    onBack: () => void;
}

type AdminSubView = 'OVERVIEW' | 'SELLERS' | 'ANIMALS' | 'AUCTIONS';

const AdminPanel: React.FC<AdminPanelProps> = ({ user, auctionUser, onBack }) => {
    const [subView, setSubView] = useState<AdminSubView>('OVERVIEW');
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({
        pendingSellers: 0,
        pendingAnimals: 0,
        pendingAuctions: 0,
        activeAuctions: 0
    });
    const [isModuleHidden, setIsModuleHidden] = useState(false);

    const [pendingSellers, setPendingSellers] = useState<any[]>([]);
    const [pendingAnimals, setPendingAnimals] = useState<any[]>([]);
    const [pendingAuctions, setPendingAuctions] = useState<any[]>([]);
    
    const [selectedSeller, setSelectedSeller] = useState<any | null>(null);
    const [signedUrls, setSignedUrls] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        fetchStats();
        fetchHiddenStatus();
        if (subView === 'SELLERS') fetchPendingSellers();
        if (subView === 'ANIMALS') fetchPendingAnimals();
        if (subView === 'AUCTIONS') fetchPendingAuctions();
    }, [subView]);

    const fetchHiddenStatus = async () => {
        const { data } = await supabase.from('app_settings').select('value').eq('key', 'auction_module_hidden').single();
        if (data?.value) setIsModuleHidden(!!data.value.enabled);
    };

    const toggleModuleVisibility = async () => {
        const newValue = !isModuleHidden;
        const { error } = await supabase.from('app_settings')
            .update({ value: { enabled: newValue } })
            .eq('key', 'auction_module_hidden');
        
        if (!error) {
            setIsModuleHidden(newValue);
            alert(`Módulo ${newValue ? 'OCULTADO' : 'VISÍVEL'} para usuários.`);
        }
    };

    const fetchStats = async () => {
        const { count: sCount } = await supabase.from('auction_seller_applications').select('*', { count: 'exact', head: true }).in('status', ['submitted', 'needs_adjustment']);
        const { count: aCount } = await supabase.from('auction_animals').select('*', { count: 'exact', head: true }).eq('status', 'pending_review');
        const { count: auCount } = await supabase.from('auctions').select('*', { count: 'exact', head: true }).eq('status', 'pending_review');
        const { count: lCount } = await supabase.from('auctions').select('*', { count: 'exact', head: true }).eq('status', 'active');
        
        setStats({
            pendingSellers: sCount || 0,
            pendingAnimals: aCount || 0,
            pendingAuctions: auCount || 0,
            activeAuctions: lCount || 0
        });
    };

    const fetchPendingSellers = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('auction_seller_applications')
            .select('*')
            .in('status', ['submitted', 'needs_adjustment'])
            .order('created_at', { ascending: false });
        setPendingSellers(data || []);
        setLoading(false);
    };

    const fetchPendingAnimals = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('auction_animals')
            .select('*')
            .eq('status', 'pending_review')
            .order('created_at', { ascending: false });
        setPendingAnimals(data || []);
        setLoading(false);
    };

    const fetchPendingAuctions = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('auctions')
            .select('*, animal:auction_animals(*)')
            .eq('status', 'pending_review')
            .order('created_at', { ascending: false });
        setPendingAuctions(data || []);
        setLoading(false);
    };

    const getSignedUrl = async (path: string) => {
        if (!path) return null;
        const { data, error } = await supabase.storage
            .from('auction-seller-documents')
            .createSignedUrl(path, 600); // 10 minutes (Reduced for security)
        
        if (error) {
            console.error('Error signing URL:', error);
            return null;
        }
        return data.signedUrl;
    };

    const handleViewSeller = async (seller: any) => {
        setLoading(true);
        try {
            const [front, back, selfie] = await Promise.all([
                getSignedUrl(seller.document_front_url),
                getSignedUrl(seller.document_back_url),
                getSignedUrl(seller.selfie_url)
            ]);

            setSignedUrls({
                [seller.id + '_front']: front || '',
                [seller.id + '_back']: back || '',
                [seller.id + '_selfie']: selfie || ''
            });

            // Log: Admin viewed document
            await supabase.from('auction_logs').insert({
                user_id: user.id,
                action: 'seller_document_viewed_by_admin',
                metadata: { 
                    application_id: seller.id, 
                    applicant_user_id: seller.user_id,
                    viewed_at: new Date().toISOString()
                }
            });

            setSelectedSeller(seller);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleApproveSeller = async (applicationId: string, applicantUserId: string) => {
        if (!confirm('Aprovar este vendedor e liberar acesso para vendas?')) return;
        setLoading(true);
        try {
            await supabase.from('auction_seller_applications').update({ 
                status: 'approved', 
                kyc_status: 'approved',
                kyc_reviewed_by: user.id, 
                kyc_reviewed_at: new Date().toISOString() 
            }).eq('id', applicationId);
            
            await supabase.from('auction_users').upsert({ 
                user_id: applicantUserId, 
                auction_role: 'seller_approved', 
                can_sell: true,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

            await createNotification({
                user_id: applicantUserId,
                actor_id: null,
                type: 'system',
                message: 'Sua verificação de identidade foi aprovada! Você já pode cadastrar animais e leilões.',
                metadata: { action: 'seller_approved' }
            });

            setSelectedSeller(null);
            fetchPendingSellers();
            fetchStats();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleRejectSeller = async (applicationId: string, applicantUserId: string) => {
        const reason = prompt('Motivo da rejeição definitiva:');
        if (!reason) return;
        setLoading(true);
        try {
            await supabase.from('auction_seller_applications').update({ 
                status: 'rejected', 
                kyc_status: 'rejected',
                kyc_rejection_reason: reason,
                kyc_reviewed_by: user.id, 
                kyc_reviewed_at: new Date().toISOString() 
            }).eq('id', applicationId);
            
            await supabase.from('auction_users').upsert({ 
                user_id: applicantUserId, 
                auction_role: 'user', 
                can_sell: false,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

            await createNotification({
                user_id: applicantUserId,
                actor_id: null,
                type: 'system',
                message: `Sua solicitação de vendedor foi recusada. Motivo: ${reason}`,
                metadata: { action: 'seller_rejected' }
            });

            setSelectedSeller(null);
            fetchPendingSellers();
            fetchStats();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleRequestAdjustment = async (applicationId: string, applicantUserId: string) => {
        const reason = prompt('O que o usuário deve ajustar? (ex: Foto da selfie está tremida)');
        if (!reason) return;
        setLoading(true);
        try {
            await supabase.from('auction_seller_applications').update({ 
                status: 'needs_adjustment', 
                kyc_status: 'needs_adjustment',
                kyc_rejection_reason: reason,
                kyc_reviewed_by: user.id, 
                kyc_reviewed_at: new Date().toISOString() 
            }).eq('id', applicationId);

            await createNotification({
                user_id: applicantUserId,
                actor_id: null,
                type: 'system',
                message: `Precisamos de um ajuste na sua verificação: ${reason}`,
                metadata: { action: 'seller_adjustment_requested' }
            });

            setSelectedSeller(null);
            fetchPendingSellers();
            fetchStats();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleApproveAnimal = async (animalId: string) => {
        if (!confirm('Aprovar este animal?')) return;
        setLoading(true);
        try {
            const { data: animal } = await supabase.from('auction_animals').update({ status: 'approved' }).eq('id', animalId).select('seller_id, name').single();
            
            if (animal) {
                await createNotification({
                    user_id: animal.seller_id,
                    actor_id: null,
                    type: 'system',
                    message: `Seu animal "${animal.name}" foi aprovado!`,
                    metadata: { action: 'animal_approved', animal_id: animalId }
                });
            }

            fetchPendingAnimals();
            fetchStats();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleApproveAuction = async (auctionId: string) => {
        if (!confirm('Aprovar este leilão?')) return;
        setLoading(true);
        try {
            const { data: auction } = await supabase.from('auctions')
                .update({ status: 'approved' })
                .eq('id', auctionId)
                .select('seller_id, animal:auction_animals(name)')
                .single();
            
            if (auction) {
                await createNotification({
                    user_id: auction.seller_id,
                    actor_id: null,
                    type: 'system',
                    message: `Seu leilão para "${auction.animal.name}" foi aprovado!`,
                    metadata: { action: 'auction_approved', auction_id: auctionId }
                });
            }

            fetchPendingAuctions();
            fetchStats();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleRejectAuction = async (auctionId: string) => {
        const reason = prompt('Motivo da rejeição:');
        if (!reason) return;
        setLoading(true);
        try {
            const { data: auction } = await supabase.from('auctions')
                .update({ status: 'rejected' })
                .eq('id', auctionId)
                .select('seller_id, animal:auction_animals(name)')
                .single();
            
            if (auction) {
                await supabase.from('auction_animals').update({ rejection_reason: reason }).eq('name', auction.animal.name);
                
                await createNotification({
                    user_id: auction.seller_id,
                    actor_id: null,
                    type: 'system',
                    message: `Seu leilão foi recusado. Motivo: ${reason}`,
                    metadata: { action: 'auction_rejected', auction_id: auctionId }
                });
            }

            fetchPendingAuctions();
            fetchStats();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const renderOverview = () => (
        <>
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 mb-6 flex items-center justify-between">
                <div>
                    <p className="text-white/40 text-[9px] font-black uppercase tracking-widest">Modo Desenvolvimento</p>
                    <p className="text-white/20 text-[8px] uppercase">Ocultar módulo para usuários comuns</p>
                </div>
                <button 
                    onClick={toggleModuleVisibility}
                    className={`w-14 h-8 rounded-full relative transition-all duration-300 ${isModuleHidden ? 'bg-[#ECA413]' : 'bg-white/10'}`}
                >
                    <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-lg transition-all duration-300 ${isModuleHidden ? 'left-7' : 'left-1'}`} />
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4 mb-8">
                <AdminStatCard label="Vendedores (KYC)" value={stats.pendingSellers} icon="verified_user" onClick={() => setSubView('SELLERS')} highlight={stats.pendingSellers > 0} />
                <AdminStatCard label="Animais p/ Análise" value={stats.pendingAnimals} icon="pets" onClick={() => setSubView('ANIMALS')} />
                <AdminStatCard label="Leilões p/ Análise" value={stats.pendingAuctions} icon="gavel" onClick={() => setSubView('AUCTIONS')} highlight={stats.pendingAuctions > 0} />
                <div className="bg-white/5 p-6 rounded-3xl border border-white/5 flex items-center justify-between opacity-50">
                    <div className="text-left">
                        <p className="text-white/20 text-[10px] uppercase font-black mb-1">Leilões Ativos</p>
                        <p className="text-white text-2xl font-black tracking-tighter">{stats.activeAuctions}</p>
                    </div>
                    <span className="material-icons text-[#ECA413]">history</span>
                </div>
            </div>
        </>
    );

    const renderSellers = () => (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-black uppercase text-sm tracking-widest">Solicitações de Vendedores</h2>
                <button onClick={() => setSubView('OVERVIEW')} className="text-[#ECA413] text-[10px] font-black uppercase tracking-widest">Voltar</button>
            </div>

            {selectedSeller ? (
                <div className="bg-[#1A1108] p-8 rounded-[40px] border border-white/10 space-y-8 animate-in slide-in-from-bottom duration-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-white text-2xl font-black uppercase tracking-tighter leading-none mb-2">{selectedSeller.full_name}</h3>
                            <p className="text-[#ECA413] text-[10px] font-black uppercase tracking-widest">{selectedSeller.farm_name || 'Individual'}</p>
                        </div>
                        <button onClick={() => setSelectedSeller(null)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/20">
                            <span className="material-icons">close</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-6 bg-black/40 p-6 rounded-3xl border border-white/5">
                        <DetailItem label="Documento" value={selectedSeller.document_number} />
                        <DetailItem label="Localização" value={`${selectedSeller.city}/${selectedSeller.state}`} />
                        <DetailItem label="WhatsApp" value={selectedSeller.phone} />
                        <DetailItem label="Instagram" value={selectedSeller.instagram || 'Não informado'} />
                    </div>

                    <div className="space-y-6">
                        <h4 className="text-white/20 text-[9px] font-black uppercase tracking-widest ml-1">Documentos KYC</h4>
                        <div className="grid grid-cols-1 gap-4">
                            <DocPreview 
                                label="RG/CPF - Frente" 
                                url={signedUrls[selectedSeller.id + '_front']} 
                                isPdf={selectedSeller.document_file_type_front === 'application/pdf'} 
                            />
                            <DocPreview 
                                label="RG/CPF - Verso" 
                                url={signedUrls[selectedSeller.id + '_back']} 
                                isPdf={selectedSeller.document_file_type_back === 'application/pdf'} 
                            />
                            <DocPreview 
                                label="Selfie" 
                                url={signedUrls[selectedSeller.id + '_selfie']} 
                                isPdf={false} 
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 pt-6">
                        <button 
                            onClick={() => handleApproveSeller(selectedSeller.id, selectedSeller.user_id)}
                            className="h-16 bg-[#ECA413] text-black rounded-2xl font-black uppercase tracking-widest active:scale-95 transition-all shadow-xl shadow-[#ECA413]/10"
                        >
                            Aprovar Vendedor
                        </button>
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={() => handleRequestAdjustment(selectedSeller.id, selectedSeller.user_id)}
                                className="h-14 bg-white/5 text-[#ECA413] rounded-2xl font-black uppercase text-[10px] tracking-widest border border-[#ECA413]/20 active:scale-95 transition-all"
                            >
                                Solicitar Ajuste
                            </button>
                            <button 
                                onClick={() => handleRejectSeller(selectedSeller.id, selectedSeller.user_id)}
                                className="h-14 bg-red-600/10 text-red-600 rounded-2xl font-black uppercase text-[10px] tracking-widest border border-red-600/20 active:scale-95 transition-all"
                            >
                                Rejeitar
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {pendingSellers.map(seller => (
                        <div key={seller.id} className="bg-[#1A1108] p-6 rounded-[32px] border border-white/5 flex items-center justify-between group active:scale-[0.98] transition-all" onClick={() => handleViewSeller(seller)}>
                            <div>
                                <p className="text-white font-black uppercase tracking-tighter text-lg">{seller.full_name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <p className="text-white/40 text-[9px] uppercase font-bold tracking-widest">{seller.farm_name || 'Individual'} • {seller.city}/{seller.state}</p>
                                    {seller.status === 'needs_adjustment' && (
                                        <span className="bg-[#ECA413]/10 text-[#ECA413] text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest border border-[#ECA413]/20">Ajuste Solicitado</span>
                                    )}
                                </div>
                            </div>
                            <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/20 group-hover:bg-[#ECA413] group-hover:text-black transition-all">
                                <span className="material-icons text-sm">visibility</span>
                            </button>
                        </div>
                    ))}
                    {pendingSellers.length === 0 && (
                        <div className="py-20 text-center opacity-20">
                            <span className="material-icons text-4xl mb-4">how_to_reg</span>
                            <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma solicitação pendente</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    const renderAnimals = () => (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-black uppercase text-sm tracking-widest">Animais Pendentes</h2>
                <button onClick={() => setSubView('OVERVIEW')} className="text-[#ECA413] text-[10px] font-black uppercase tracking-widest">Voltar</button>
            </div>
            {pendingAnimals.map(animal => (
                <div key={animal.id} className="bg-[#1A1108] p-6 rounded-[32px] border border-white/5 space-y-4">
                    <div className="flex gap-4">
                        <img src={animal.main_image_url} className="w-16 h-16 rounded-2xl object-cover" alt="" />
                        <div>
                            <p className="text-white font-black uppercase tracking-tighter text-lg">{animal.name}</p>
                            <p className="text-white/40 text-[9px] uppercase font-bold tracking-widest">{animal.breed} • {animal.age}</p>
                        </div>
                    </div>
                    <button onClick={() => handleApproveAnimal(animal.id)} className="w-full h-12 bg-[#ECA413] text-black rounded-xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all">Aprovar Animal</button>
                </div>
            ))}
            {pendingAnimals.length === 0 && (
                <div className="py-20 text-center opacity-20">
                    <span className="material-icons text-4xl mb-4">pets</span>
                    <p className="text-[10px] font-black uppercase tracking-widest">Nenhum animal pendente</p>
                </div>
            )}
        </div>
    );

    const renderAuctions = () => (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-black uppercase text-sm tracking-widest">Leilões p/ Análise</h2>
                <button onClick={() => setSubView('OVERVIEW')} className="text-[#ECA413] text-[10px] font-black uppercase tracking-widest">Voltar</button>
            </div>
            {pendingAuctions.map(auction => (
                <div key={auction.id} className="bg-[#1A1108] p-6 rounded-[32px] border border-white/5 space-y-6">
                    <div className="flex gap-5">
                        <img src={auction.animal?.main_image_url} className="w-20 h-20 rounded-2xl object-cover border border-white/10" alt="" />
                        <div className="flex-1">
                            <p className="text-white font-black uppercase tracking-tighter text-lg leading-tight mb-1">{auction.animal?.name}</p>
                            <p className="text-[#ECA413] text-[10px] font-black uppercase tracking-widest">{auction.animal?.breed}</p>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="bg-white/5 text-white/40 text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest">Início: {new Date(auction.start_at).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-y border-white/5 py-4">
                        <div>
                            <p className="text-white/20 text-[8px] font-black uppercase tracking-widest mb-1">Lance Inicial</p>
                            <p className="text-white text-sm font-black tracking-tighter">R$ {auction.starting_bid.toLocaleString('pt-BR')}</p>
                        </div>
                        <div>
                            <p className="text-white/20 text-[8px] font-black uppercase tracking-widest mb-1">Incremento</p>
                            <p className="text-white text-sm font-black tracking-tighter">R$ {auction.minimum_increment.toLocaleString('pt-BR')}</p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button onClick={() => handleApproveAuction(auction.id)} className="flex-[2] h-14 bg-green-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all shadow-lg shadow-green-600/10">Aprovar Leilão</button>
                        <button onClick={() => handleRejectAuction(auction.id)} className="flex-1 h-14 bg-red-600/10 text-red-600 rounded-xl font-black uppercase text-[10px] tracking-widest border border-red-600/20 active:scale-95 transition-all">Recusar</button>
                    </div>
                </div>
            ))}
            {pendingAuctions.length === 0 && (
                <div className="py-20 text-center opacity-20">
                    <span className="material-icons text-4xl mb-4">check_circle</span>
                    <p className="text-[10px] font-black uppercase tracking-widest">Nenhum leilão pendente</p>
                </div>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-[#0F0A05] p-6 pb-32 overflow-x-hidden">
            <div className="flex items-center gap-4 mb-8 pt-6">
                <button onClick={onBack} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 active:scale-90 transition-all">
                    <span className="material-icons">arrow_back</span>
                </button>
                <h1 className="text-xl font-black uppercase tracking-tighter text-[#ECA413]">Gestão de Leilões</h1>
            </div>

            {subView === 'OVERVIEW' && renderOverview()}
            {subView === 'SELLERS' && renderSellers()}
            {subView === 'ANIMALS' && renderAnimals()}
            {subView === 'AUCTIONS' && renderAuctions()}

            {loading && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-[#ECA413] text-black px-6 py-2 rounded-full font-black uppercase text-[10px] tracking-widest shadow-2xl z-[100] animate-bounce">
                    Processando...
                </div>
            )}
        </div>
    );
};

const AdminStatCard: React.FC<{ label: string; value: number; icon: string; onClick: () => void; highlight?: boolean }> = ({ label, value, icon, onClick, highlight }) => (
    <button 
        onClick={onClick}
        className={`p-6 rounded-[32px] border flex items-center justify-between active:scale-[0.98] transition-all ${
            highlight ? 'bg-[#ECA413]/10 border-[#ECA413]/20 shadow-xl shadow-[#ECA413]/5' : 'bg-white/5 border-white/5'
        }`}
    >
        <div className="text-left">
            <p className="text-white/20 text-[10px] uppercase font-black mb-1">{label}</p>
            <p className={`text-2xl font-black tracking-tighter ${highlight ? 'text-[#ECA413]' : 'text-white'}`}>{value}</p>
        </div>
        <span className={`material-icons ${highlight ? 'text-[#ECA413]' : 'text-white/20'}`}>{icon}</span>
    </button>
);

const DetailItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div>
        <p className="text-white/20 text-[8px] font-black uppercase tracking-widest mb-1">{label}</p>
        <p className="text-white text-xs font-bold truncate">{value}</p>
    </div>
);

const DocPreview: React.FC<{ label: string; url: string; isPdf?: boolean }> = ({ label, url, isPdf }) => (
    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
        <div className="flex items-center justify-between mb-3">
            <p className="text-white/40 text-[9px] font-black uppercase tracking-widest">{label}</p>
            <a 
                href={url} 
                target="_blank" 
                rel="noreferrer"
                className="text-[#ECA413] text-[8px] font-black uppercase tracking-widest flex items-center gap-1"
            >
                <span className="material-icons text-xs">open_in_new</span>
                Abrir Original
            </a>
        </div>
        <div className="aspect-video bg-black/40 rounded-xl flex items-center justify-center overflow-hidden border border-white/5 relative">
            {/* Watermark Overlay */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center rotate-[-15deg] opacity-[0.05] select-none z-10">
                <p className="text-white text-[24px] font-black uppercase tracking-widest">+Vaquejada</p>
                <p className="text-white text-[10px] font-black uppercase tracking-widest">Documento Sensível</p>
            </div>
            
            {isPdf ? (
                <div className="flex flex-col items-center gap-2">
                    <span className="material-icons text-[#ECA413] text-3xl">picture_as_pdf</span>
                    <p className="text-white/20 text-[8px] font-black uppercase">Arquivo PDF</p>
                </div>
            ) : url ? (
                <img src={url} className="w-full h-full object-contain" alt="" />
            ) : (
                <p className="text-white/10 text-[8px] font-black uppercase">Erro ao carregar</p>
            )}
        </div>
    </div>
);

export default AdminPanel;
