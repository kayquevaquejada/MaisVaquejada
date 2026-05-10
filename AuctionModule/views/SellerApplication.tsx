import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { User } from '../../types';

interface SellerApplicationProps {
    user: User;
    onBack: () => void;
    onSuccess: () => void;
}

const SellerApplication: React.FC<SellerApplicationProps> = ({ user, onBack, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        fullName: user.name || '',
        documentNumber: '',
        phone: user.phone || '',
        email: user.email || '',
        city: user.city_name || '',
        state: user.state_name || '',
        farmName: '',
        instagram: '',
        experienceDescription: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase
                .from('auction_seller_applications')
                .insert([{
                    user_id: user.id,
                    full_name: formData.fullName,
                    document_number: formData.documentNumber,
                    phone: formData.phone,
                    email: formData.email,
                    city: formData.city,
                    state: formData.state,
                    farm_name: formData.farmName,
                    instagram: formData.instagram,
                    experience_description: formData.experienceDescription,
                    status: 'submitted'
                }]);

            if (error) throw error;

            // Upsert user role to pending
            await supabase
                .from('auction_users')
                .upsert({ 
                    user_id: user.id, 
                    auction_role: 'seller_pending',
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });

            onSuccess();
        } catch (err) {
            console.error('Error submitting application:', err);
            alert('Erro ao enviar solicitação. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0F0A05] p-6 pb-20">
            <div className="flex items-center gap-4 mb-8 pt-6">
                <button onClick={onBack} className="material-icons text-white/40">arrow_back</button>
                <h1 className="text-xl font-black uppercase tracking-tighter text-[#ECA413]">Solicitar Autorização</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 max-w-md mx-auto">
                <div className="space-y-4">
                    <h2 className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/5 pb-2">Dados do Responsável</h2>
                    
                    <div className="space-y-2">
                        <label className="text-white/20 text-[8px] uppercase font-bold ml-2">Nome Completo</label>
                        <input 
                            required
                            value={formData.fullName}
                            onChange={e => setFormData({...formData, fullName: e.target.value})}
                            className="w-full h-14 bg-white/5 rounded-2xl px-6 text-white text-xs border border-white/5 focus:border-[#ECA413]/50 focus:outline-none transition-all"
                            placeholder="Seu nome"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-white/20 text-[8px] uppercase font-bold ml-2">CPF ou CNPJ</label>
                        <input 
                            required
                            value={formData.documentNumber}
                            onChange={e => setFormData({...formData, documentNumber: e.target.value})}
                            className="w-full h-14 bg-white/5 rounded-2xl px-6 text-white text-xs border border-white/5 focus:border-[#ECA413]/50 focus:outline-none transition-all"
                            placeholder="000.000.000-00"
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <h2 className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/5 pb-2">Dados Comerciais</h2>
                    
                    <div className="space-y-2">
                        <label className="text-white/20 text-[8px] uppercase font-bold ml-2">Nome do Haras/Fazenda</label>
                        <input 
                            value={formData.farmName}
                            onChange={e => setFormData({...formData, farmName: e.target.value})}
                            className="w-full h-14 bg-white/5 rounded-2xl px-6 text-white text-xs border border-white/5 focus:border-[#ECA413]/50 focus:outline-none transition-all"
                            placeholder="Nome da sua propriedade"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-white/20 text-[8px] uppercase font-bold ml-2">Experiência com Vendas</label>
                        <textarea 
                            value={formData.experienceDescription}
                            onChange={e => setFormData({...formData, experienceDescription: e.target.value})}
                            className="w-full min-h-[120px] bg-white/5 rounded-2xl p-6 text-white text-xs border border-white/5 focus:border-[#ECA413]/50 focus:outline-none transition-all resize-none"
                            placeholder="Conte um pouco sobre sua história com cavalos..."
                        />
                    </div>
                </div>

                <div className="bg-[#ECA413]/5 border border-[#ECA413]/10 rounded-2xl p-6 space-y-4">
                    <div className="flex items-start gap-3">
                        <input type="checkbox" required className="mt-1 accent-[#ECA413]" />
                        <p className="text-white/40 text-[10px] leading-relaxed">Concordo com as regras de comissão e termos de uso do Módulo de Leilões do +Vaquejada.</p>
                    </div>
                </div>

                <button 
                    disabled={loading}
                    className={`w-full h-16 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all ${
                        loading ? 'bg-white/10 text-white/40' : 'bg-[#ECA413] text-black'
                    }`}
                >
                    {loading ? 'Enviando...' : 'Enviar Solicitação'}
                </button>
            </form>
        </div>
    );
};

export default SellerApplication;
