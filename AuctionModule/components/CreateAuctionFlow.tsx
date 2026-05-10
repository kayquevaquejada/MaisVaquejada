import React, { useState } from 'react';
import { User } from '../../types';
import { AuctionAnimal, Auction } from '../types';
import { useAuction } from '../hooks/useAuction';
import { compressImage } from '../../lib/imageUtils';
import { supabase } from '../../lib/supabase';

interface CreateAuctionFlowProps {
    user: User;
    onClose: () => void;
    onSuccess: () => void;
}

const steps = [
    { id: 1, title: 'Dados do Animal', icon: '🐎' },
    { id: 2, title: 'Fotos e Vídeos', icon: '📸' },
    { id: 3, title: 'Configuração', icon: '⚙️' },
    { id: 4, title: 'Revisão', icon: '📋' },
];

const CreateAuctionFlow: React.FC<CreateAuctionFlowProps> = ({ user, onClose, onSuccess }) => {
    const { createAnimal, createAuction } = useAuction();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    
    // Form State
    const [animalData, setAnimalData] = useState<Partial<AuctionAnimal>>({
        name: '',
        type: 'horse',
        breed: '',
        sex: 'male',
        age: '',
        coat: '',
        city: '',
        state: '',
        description: '',
        registration_number: '',
        pedigree: '',
        height: '',
        weight: '',
        gallery_image_urls: [],
    });

    const [auctionData, setAuctionData] = useState<Partial<Auction>>({
        starting_bid: 0,
        minimum_increment: 100,
        start_at: '',
        end_at: '',
    });

    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [uploadProgress, setUploadProgress] = useState(0);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
        }
    };

    const removeFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const nextStep = () => setCurrentStep(prev => Math.min(steps.length, prev + 1));
    const prevStep = () => setCurrentStep(prev => Math.max(1, prev - 1));

    const handleSubmit = async () => {
        setLoading(true);
        try {
            // 1. Upload Images
            const uploadedUrls: string[] = [];
            for (let i = 0; i < selectedFiles.length; i++) {
                const file = selectedFiles[i];
                const compressed = await compressImage(file);
                const fileName = `${user.id}/${Date.now()}-${i}.jpg`;
                
                const { data, error } = await supabase.storage
                    .from('vaquejadas')
                    .upload(`auctions/${fileName}`, compressed);
                
                if (error) throw error;
                
                const { data: { publicUrl } } = supabase.storage
                    .from('vaquejadas')
                    .getPublicUrl(`auctions/${fileName}`);
                
                uploadedUrls.push(publicUrl);
                setUploadProgress(Math.round(((i + 1) / selectedFiles.length) * 100));
            }

            // 2. Create Animal
            const finalAnimalData = {
                ...animalData,
                seller_id: user.id,
                main_image_url: uploadedUrls[0] || '',
                gallery_image_urls: uploadedUrls,
                status: 'pending_review' as any
            };

            const animalRes = await createAnimal(finalAnimalData);
            if (!animalRes.success) throw new Error(animalRes.error);

            // 3. Create Auction
            const finalAuctionData = {
                ...auctionData,
                animal_id: animalRes.data.id,
                seller_id: user.id,
                status: 'pending_review' as any,
                current_bid: 0, // Will be set to starting_bid on start
            };

            const auctionRes = await createAuction(finalAuctionData);
            if (!auctionRes.success) throw new Error(auctionRes.error);

            onSuccess();
        } catch (err: any) {
            alert('Erro ao criar leilão: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-[#0F0A05] flex flex-col animate-in fade-in duration-300">
            {/* Header */}
            <div className="px-6 pt-12 pb-6 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40">
                        <span className="material-icons">close</span>
                    </button>
                    <div>
                        <h1 className="text-white font-black uppercase tracking-tighter text-lg">Novo Leilão</h1>
                        <p className="text-[#ECA413] text-[10px] font-black uppercase tracking-widest">Passo {currentStep} de {steps.length}</p>
                    </div>
                </div>
                <div className="flex gap-1">
                    {steps.map(step => (
                        <div 
                            key={step.id} 
                            className={`h-1.5 w-6 rounded-full transition-all duration-500 ${currentStep >= step.id ? 'bg-[#ECA413]' : 'bg-white/10'}`} 
                        />
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto px-6 py-8">
                {currentStep === 1 && (
                    <div className="space-y-6 animate-in slide-in-from-right duration-500">
                        <div className="grid grid-cols-1 gap-6">
                            <Input label="Nome do Animal" value={animalData.name} onChange={v => setAnimalData({...animalData, name: v})} placeholder="Ex: Thunder Fire" />
                            <div className="grid grid-cols-2 gap-4">
                                <Select label="Raça" value={animalData.breed} onChange={v => setAnimalData({...animalData, breed: v})} options={['Quarto de Milha', 'Paint Horse', 'Appaloosa', 'Mangalarga', 'Crioulo']} />
                                <Select label="Sexo" value={animalData.sex} onChange={v => setAnimalData({...animalData, sex: v as any})} options={['Macho', 'Fêmea']} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Idade" value={animalData.age} onChange={v => setAnimalData({...animalData, age: v})} placeholder="Ex: 4 anos" />
                                <Input label="Pelagem" value={animalData.coat} onChange={v => setAnimalData({...animalData, coat: v})} placeholder="Ex: Alazão" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Cidade" value={animalData.city} onChange={v => setAnimalData({...animalData, city: v})} placeholder="Ex: Campina Grande" />
                                <Input label="Estado (UF)" value={animalData.state} onChange={v => setAnimalData({...animalData, state: v})} placeholder="Ex: PB" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Registro (Opcional)" value={animalData.registration_number} onChange={v => setAnimalData({...animalData, registration_number: v})} placeholder="Nº de Registro" />
                                <Input label="Altura" value={animalData.height} onChange={v => setAnimalData({...animalData, height: v})} placeholder="Ex: 1.55m" />
                            </div>
                            <Textarea label="Descrição Detalhada" value={animalData.description} onChange={v => setAnimalData({...animalData, description: v})} placeholder="Conte a história do animal, linhagem e conquistas..." />
                        </div>
                    </div>
                )}

                {currentStep === 2 && (
                    <div className="space-y-8 animate-in slide-in-from-right duration-500">
                        <div className="border-2 border-dashed border-white/10 rounded-[40px] p-12 text-center relative group hover:border-[#ECA413]/40 transition-colors">
                            <input type="file" multiple accept="image/*" onChange={handleFileSelect} className="absolute inset-0 opacity-0 cursor-pointer" />
                            <div className="w-20 h-20 bg-[#ECA413]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                <span className="material-icons text-[#ECA413] text-4xl">add_a_photo</span>
                            </div>
                            <h3 className="text-white font-black uppercase tracking-widest text-sm mb-2">Clique para selecionar fotos</h3>
                            <p className="text-white/20 text-[10px] uppercase font-bold">Mínimo de 3 fotos recomendadas • Máx 10MB por arquivo</p>
                        </div>

                        {selectedFiles.length > 0 && (
                            <div className="grid grid-cols-2 gap-4">
                                {selectedFiles.map((file, i) => (
                                    <div key={i} className="relative aspect-square rounded-3xl overflow-hidden border border-white/5 group">
                                        <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt="" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button onClick={() => removeFile(i)} className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-white">
                                                <span className="material-icons">delete</span>
                                            </button>
                                        </div>
                                        {i === 0 && (
                                            <div className="absolute top-3 left-3 bg-[#ECA413] text-black text-[7px] font-black uppercase px-2 py-1 rounded-md tracking-widest shadow-lg">
                                                Capa
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {currentStep === 3 && (
                    <div className="space-y-6 animate-in slide-in-from-right duration-500">
                        <Input label="Lance Inicial (R$)" type="number" value={auctionData.starting_bid?.toString()} onChange={v => setAuctionData({...auctionData, starting_bid: parseFloat(v)})} placeholder="Ex: 5000" />
                        <Input label="Incremento Mínimo (R$)" type="number" value={auctionData.minimum_increment?.toString()} onChange={v => setAuctionData({...auctionData, minimum_increment: parseFloat(v)})} placeholder="Ex: 100" />
                        
                        <div className="grid grid-cols-1 gap-6">
                            <Input label="Início do Leilão" type="datetime-local" value={auctionData.start_at} onChange={v => setAuctionData({...auctionData, start_at: v})} />
                            <Input label="Término do Leilão" type="datetime-local" value={auctionData.end_at} onChange={v => setAuctionData({...auctionData, end_at: v})} />
                        </div>

                        <div className="bg-[#ECA413]/5 border border-[#ECA413]/20 p-6 rounded-3xl">
                            <div className="flex gap-4">
                                <span className="material-icons text-[#ECA413]">info</span>
                                <p className="text-[#ECA413] text-[10px] font-black uppercase tracking-tight leading-relaxed">
                                    O leilão será publicado com status "Agendado" e entrará "Ao Vivo" automaticamente na data de início.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {currentStep === 4 && (
                    <div className="space-y-8 animate-in slide-in-from-right duration-500">
                        <div className="bg-white/5 rounded-[40px] p-8 border border-white/10">
                            <div className="flex gap-6 mb-8">
                                <div className="w-24 h-24 rounded-3xl overflow-hidden shrink-0">
                                    <img src={selectedFiles[0] ? URL.createObjectURL(selectedFiles[0]) : ''} className="w-full h-full object-cover" alt="" />
                                </div>
                                <div>
                                    <h2 className="text-white text-2xl font-black uppercase italic tracking-tighter">{animalData.name}</h2>
                                    <p className="text-[#ECA413] text-[10px] font-black uppercase tracking-widest">{animalData.breed} • {animalData.age}</p>
                                    <div className="flex items-center gap-1 text-white/40 mt-2">
                                        <span className="material-icons text-xs">location_on</span>
                                        <span className="text-[10px] font-black uppercase">{animalData.city}, {animalData.state}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6 border-t border-white/5 pt-8">
                                <div>
                                    <p className="text-white/20 text-[9px] font-black uppercase tracking-widest mb-1">Lance Inicial</p>
                                    <p className="text-white text-lg font-black tracking-tighter">R$ {auctionData.starting_bid?.toLocaleString('pt-BR')}</p>
                                </div>
                                <div>
                                    <p className="text-white/20 text-[9px] font-black uppercase tracking-widest mb-1">Incremento</p>
                                    <p className="text-white text-lg font-black tracking-tighter">R$ {auctionData.minimum_increment?.toLocaleString('pt-BR')}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-white/20 text-[9px] font-black uppercase tracking-widest mb-1">Duração</p>
                                    <p className="text-white text-xs font-black uppercase tracking-tight">
                                        De {new Date(auctionData.start_at || '').toLocaleString()} <br/>
                                        Até {new Date(auctionData.end_at || '').toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="text-center px-6">
                            <p className="text-white/40 text-[10px] font-black uppercase tracking-widest leading-relaxed">
                                Ao enviar para análise, nossa equipe verificará os dados em até 24 horas. Você será notificado sobre a aprovação.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Actions */}
            <div className="px-6 pb-12 pt-6 bg-[#0F0A05] border-t border-white/5">
                <div className="flex gap-4">
                    {currentStep > 1 && (
                        <button 
                            onClick={prevStep}
                            disabled={loading}
                            className="flex-1 h-16 bg-white/5 text-white/60 rounded-2xl font-black uppercase tracking-widest active:scale-95 transition-all"
                        >
                            Anterior
                        </button>
                    )}
                    
                    {currentStep < 4 ? (
                        <button 
                            onClick={nextStep}
                            className="flex-[2] h-16 bg-[#ECA413] text-black rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-[#ECA413]/10 active:scale-95 transition-all"
                        >
                            Próximo
                        </button>
                    ) : (
                        <button 
                            onClick={handleSubmit}
                            disabled={loading}
                            className="flex-[2] h-16 bg-[#ECA413] text-black rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-[#ECA413]/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                    <span>ENVIANDO {uploadProgress}%</span>
                                </>
                            ) : (
                                <>
                                    <span className="material-icons">check_circle</span>
                                    <span>ENVIAR PARA ANÁLISE</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// Internal Helper Components
const Input: React.FC<{ label: string; value?: string; onChange: (v: string) => void; placeholder?: string; type?: string }> = ({ label, value, onChange, placeholder, type = 'text' }) => (
    <div className="flex flex-col gap-2">
        <label className="text-white/20 text-[9px] font-black uppercase tracking-[0.2em] ml-1">{label}</label>
        <input 
            type={type}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white text-sm font-bold focus:border-[#ECA413]/40 focus:bg-[#ECA413]/5 transition-all outline-none placeholder:text-white/10"
        />
    </div>
);

const Select: React.FC<{ label: string; value?: string; onChange: (v: string) => void; options: string[] }> = ({ label, value, onChange, options }) => (
    <div className="flex flex-col gap-2">
        <label className="text-white/20 text-[9px] font-black uppercase tracking-[0.2em] ml-1">{label}</label>
        <select 
            value={value}
            onChange={e => onChange(e.target.value)}
            className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white text-sm font-bold focus:border-[#ECA413]/40 focus:bg-[#ECA413]/5 transition-all outline-none"
        >
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
    </div>
);

const Textarea: React.FC<{ label: string; value?: string; onChange: (v: string) => void; placeholder?: string }> = ({ label, value, onChange, placeholder }) => (
    <div className="flex flex-col gap-2">
        <label className="text-white/20 text-[9px] font-black uppercase tracking-[0.2em] ml-1">{label}</label>
        <textarea 
            rows={4}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-white text-sm font-bold focus:border-[#ECA413]/40 focus:bg-[#ECA413]/5 transition-all outline-none placeholder:text-white/10 resize-none"
        />
    </div>
);

export default CreateAuctionFlow;
