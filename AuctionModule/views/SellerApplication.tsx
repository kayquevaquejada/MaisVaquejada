import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { User } from '../../types';
interface SellerApplicationProps {
    user: User;
    onBack: () => void;
    onSuccess: () => void;
}

const steps = [
    { id: 1, title: 'Dados Pessoais', icon: 'person' },
    { id: 2, title: 'Haras & Experiência', icon: 'auto_awesome' },
    { id: 3, title: 'Identidade', icon: 'badge' },
    { id: 4, title: 'Termos', icon: 'fact_check' }
];

const SellerApplication: React.FC<SellerApplicationProps> = ({ user, onBack, onSuccess }) => {
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [uploadingStatus, setUploadingStatus] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        fullName: user.name || '',
        documentNumber: '',
        phone: user.phone || '',
        email: user.email || '',
        city: user.city_name || '',
        state: user.state_name || '',
        farmName: '',
        instagram: '',
        experienceDescription: '',
        termsAccepted: false,
        kycTermsAccepted: false,
        dataStorageAccepted: false,
        dataRetentionAccepted: false
    });

    const [files, setFiles] = useState<{
        front: File | null;
        back: File | null;
        selfie: File | null;
    }>({
        front: null,
        back: null,
        selfie: null
    });

    const [previews, setPreviews] = useState<{
        front: string | null;
        back: string | null;
        selfie: string | null;
    }>({
        front: null,
        back: null,
        selfie: null
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'front' | 'back' | 'selfie') => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            alert('Arquivo muito grande. Máximo 10MB.');
            return;
        }

        setFiles(prev => ({ ...prev, [type]: file }));
        
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviews(prev => ({ ...prev, [type]: reader.result as string }));
            };
            reader.readAsDataURL(file);
        } else {
            setPreviews(prev => ({ ...prev, [type]: null }));
        }
    };

    const uploadDocument = async (file: File, type: string) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${type}_${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('auction-seller-documents')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        return filePath;
    };

    const handleSubmit = async () => {
        if (!files.front || !files.back || !files.selfie) {
            alert('Por favor, envie todos os documentos obrigatórios.');
            return;
        }

        setLoading(true);
        setUploadingStatus('Enviando documentos...');

        try {
            // 1. Upload Files
            const [frontPath, backPath, selfiePath] = await Promise.all([
                uploadDocument(files.front, 'front'),
                uploadDocument(files.back, 'back'),
                uploadDocument(files.selfie, 'selfie')
            ]);

            // Log: Documents uploaded
            await supabase.from('auction_logs').insert({
                user_id: user.id,
                action: 'seller_documents_uploaded',
                metadata: {
                    front_type: files.front.type,
                    back_type: files.back.type,
                    selfie_type: files.selfie.type,
                    uploaded_at: new Date().toISOString()
                }
            });

            setUploadingStatus('Salvando solicitação...');

            // 2. Insert Application
            const { error: insertError } = await supabase
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
                    document_front_url: frontPath,
                    document_back_url: backPath,
                    selfie_url: selfiePath,
                    document_file_type_front: files.front.type,
                    document_file_type_back: files.back.type,
                    selfie_file_type: files.selfie.type,
                    status: 'submitted',
                    kyc_status: 'pending',
                    data_retention_accepted: formData.dataRetentionAccepted
                }]);

            if (insertError) throw insertError;

            // 3. Update User Role
            await supabase
                .from('auction_users')
                .upsert({ 
                    user_id: user.id, 
                    auction_role: 'seller_pending',
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });

            onSuccess();
        } catch (err: any) {
            console.error('KYC Error:', err);
            alert('Erro ao processar documentos: ' + err.message);
        } finally {
            setLoading(false);
            setUploadingStatus(null);
        }
    };

    const nextStep = () => setCurrentStep(prev => Math.min(4, prev + 1));
    const prevStep = () => setCurrentStep(prev => Math.max(1, prev - 1));

    return (
        <div className="min-h-screen bg-[#0F0A05] flex flex-col">
            {/* Header */}
            <div className="px-6 pt-12 pb-6 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#0F0A05]/90 backdrop-blur-xl z-50">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40">
                        <span className="material-icons">arrow_back</span>
                    </button>
                    <div>
                        <h1 className="text-white font-black uppercase tracking-tighter text-lg leading-tight">Ser Vendedor</h1>
                        <p className="text-[#ECA413] text-[9px] font-black uppercase tracking-widest mt-0.5">Verificação de Identidade</p>
                    </div>
                </div>
                <div className="flex gap-1.5">
                    {steps.map(s => (
                        <div key={s.id} className={`h-1 rounded-full transition-all duration-500 ${currentStep >= s.id ? 'w-6 bg-[#ECA413]' : 'w-2 bg-white/10'}`} />
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-8">
                <div className="max-w-md mx-auto">
                    
                    {/* Step Content */}
                    {currentStep === 1 && (
                        <div className="space-y-6 animate-in slide-in-from-right duration-500">
                            <h2 className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em] mb-8">Dados do Responsável</h2>
                            <Input label="Nome Completo" value={formData.fullName} onChange={v => setFormData({...formData, fullName: v})} placeholder="Como no documento" />
                            <Input label="CPF ou CNPJ" value={formData.documentNumber} onChange={v => setFormData({...formData, documentNumber: v})} placeholder="000.000.000-00" />
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Cidade" value={formData.city} onChange={v => setFormData({...formData, city: v})} placeholder="Ex: Campina Grande" />
                                <Input label="Estado (UF)" value={formData.state} onChange={v => setFormData({...formData, state: v})} placeholder="PB" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Telefone/WhatsApp" value={formData.phone} onChange={v => setFormData({...formData, phone: v})} placeholder="(00) 00000-0000" />
                                <Input label="E-mail" value={formData.email} onChange={v => setFormData({...formData, email: v})} placeholder="contato@exemplo.com" />
                            </div>
                        </div>
                    )}

                    {currentStep === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-right duration-500">
                            <h2 className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em] mb-8">Haras e Experiência</h2>
                            <Input label="Nome do Haras/Fazenda" value={formData.farmName} onChange={v => setFormData({...formData, farmName: v})} placeholder="Se houver" />
                            <Input label="Instagram" value={formData.instagram} onChange={v => setFormData({...formData, instagram: v})} placeholder="@seu_haras" />
                            <div className="flex flex-col gap-2">
                                <label className="text-white/20 text-[9px] font-black uppercase tracking-widest ml-1">Experiência com Vendas</label>
                                <textarea 
                                    value={formData.experienceDescription}
                                    onChange={e => setFormData({...formData, experienceDescription: e.target.value})}
                                    className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-6 text-white text-xs font-bold focus:border-[#ECA413]/50 transition-all resize-none"
                                    placeholder="Conte um pouco sobre sua trajetória no meio equestre..."
                                />
                            </div>
                        </div>
                    )}

                    {currentStep === 3 && (
                        <div className="space-y-8 animate-in slide-in-from-right duration-500">
                            <div className="bg-[#ECA413]/5 border border-[#ECA413]/20 p-6 rounded-[32px] mb-8">
                                <p className="text-[#ECA413] text-[10px] font-black uppercase tracking-tight leading-relaxed">
                                    Para manter os leilões seguros, precisamos validar seus documentos antes de liberar a venda de animais.
                                </p>
                            </div>

                            <DocumentUpload 
                                label="RG ou CPF - FRENTE" 
                                file={files.front} 
                                preview={previews.front}
                                onChange={e => handleFileChange(e, 'front')} 
                            />
                            
                            <DocumentUpload 
                                label="RG ou CPF - VERSO" 
                                file={files.back} 
                                preview={previews.back}
                                onChange={e => handleFileChange(e, 'back')} 
                            />

                            <DocumentUpload 
                                label="SELFIE COM O DOCUMENTO" 
                                file={files.selfie} 
                                preview={previews.selfie}
                                isSelfie
                                onChange={e => handleFileChange(e, 'selfie')} 
                            />
                        </div>
                    )}

                    {currentStep === 4 && (
                        <div className="space-y-8 animate-in slide-in-from-right duration-500">
                            <h2 className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em] mb-8">Termos e Autorizações</h2>
                            
                            <div className="space-y-4">
                                <TermCheckbox 
                                    checked={formData.kycTermsAccepted} 
                                    onChange={v => setFormData({...formData, kycTermsAccepted: v})}
                                    label="Declaro que as informações enviadas são verdadeiras."
                                />
                                <TermCheckbox 
                                    checked={formData.dataStorageAccepted} 
                                    onChange={v => setFormData({...formData, dataStorageAccepted: v})}
                                    label="Autorizo o +Vaquejada a armazenar meus documentos para análise de segurança."
                                />
                                <TermCheckbox 
                                    checked={formData.dataRetentionAccepted} 
                                    onChange={v => setFormData({...formData, dataRetentionAccepted: v})}
                                    label="Autorizo o armazenamento temporário dos meus documentos para fins de validação de identidade e segurança da plataforma (LGPD)."
                                />
                                <TermCheckbox 
                                    checked={formData.termsAccepted} 
                                    onChange={v => setFormData({...formData, termsAccepted: v})}
                                    label="Concordo com as regras dos leilões e comissão da plataforma."
                                />
                            </div>

                            <div className="p-8 bg-white/5 rounded-[40px] border border-white/5 flex flex-col items-center text-center">
                                <span className="material-icons text-[#ECA413] text-4xl mb-4">verified_user</span>
                                <p className="text-white/40 text-[10px] font-black uppercase tracking-widest leading-relaxed">
                                    Sua solicitação passará por uma análise criteriosa da nossa equipe de segurança. O prazo médio de resposta é de 24 horas úteis.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-12 pt-6 bg-[#0F0A05] border-t border-white/5">
                <div className="flex gap-4 max-w-md mx-auto">
                    {currentStep > 1 && (
                        <button 
                            onClick={prevStep}
                            className="flex-1 h-16 bg-white/5 text-white/40 rounded-2xl font-black uppercase tracking-widest active:scale-95 transition-all"
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
                            disabled={loading || !formData.termsAccepted || !formData.kycTermsAccepted || !formData.dataStorageAccepted || !formData.dataRetentionAccepted}
                            className={`flex-[2] h-16 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-3 ${
                                loading || !formData.termsAccepted || !formData.kycTermsAccepted || !formData.dataStorageAccepted || !formData.dataRetentionAccepted
                                ? 'bg-white/10 text-white/20' 
                                : 'bg-[#ECA413] text-black active:scale-95 shadow-[#ECA413]/20'
                            }`}
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                    <span>{uploadingStatus || 'ENVIANDO...'}</span>
                                </>
                            ) : (
                                <>
                                    <span className="material-icons">cloud_upload</span>
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

// Internal Components
const Input: React.FC<{ label: string; value: string; onChange: (v: string) => void; placeholder?: string }> = ({ label, value, onChange, placeholder }) => (
    <div className="flex flex-col gap-2">
        <label className="text-white/20 text-[9px] font-black uppercase tracking-widest ml-1">{label}</label>
        <input 
            value={value}
            onChange={e => onChange(e.target.value)}
            className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white text-xs font-bold focus:border-[#ECA413]/50 transition-all outline-none"
            placeholder={placeholder}
        />
    </div>
);

const DocumentUpload: React.FC<{ label: string; file: File | null; preview: string | null; onChange: (e: any) => void; isSelfie?: boolean }> = ({ label, file, preview, onChange, isSelfie }) => (
    <div className="space-y-3">
        <label className="text-white/20 text-[9px] font-black uppercase tracking-widest ml-1">{label}</label>
        <div className="relative group">
            <input 
                type="file" 
                accept={isSelfie ? "image/*" : "image/*,application/pdf"} 
                capture={isSelfie ? "user" : undefined}
                onChange={onChange} 
                className="absolute inset-0 opacity-0 z-10 cursor-pointer" 
            />
            <div className={`w-full min-h-[160px] rounded-[32px] border-2 border-dashed transition-all flex flex-col items-center justify-center p-6 ${
                file ? 'bg-[#ECA413]/5 border-[#ECA413]/40' : 'bg-white/5 border-white/10 group-hover:border-white/20'
            }`}>
                {preview ? (
                    <img src={preview} className="w-full max-h-40 object-contain rounded-xl" alt="" />
                ) : file ? (
                    <div className="flex flex-col items-center gap-2">
                        <span className="material-icons text-[#ECA413] text-4xl">description</span>
                        <p className="text-white text-[10px] font-black uppercase tracking-widest text-center max-w-[200px] truncate">{file.name}</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center">
                            <span className="material-icons text-white/20">{isSelfie ? 'photo_camera' : 'upload_file'}</span>
                        </div>
                        <p className="text-white/20 text-[8px] font-black uppercase tracking-widest">Clique para selecionar ou capturar</p>
                    </div>
                )}
            </div>
        </div>
    </div>
);

const TermCheckbox: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string }> = ({ checked, onChange, label }) => (
    <button 
        type="button"
        onClick={() => onChange(!checked)}
        className="flex items-start gap-4 w-full text-left active:scale-[0.98] transition-all"
    >
        <div className={`w-6 h-6 rounded-lg border-2 shrink-0 flex items-center justify-center transition-all ${checked ? 'bg-[#ECA413] border-[#ECA413]' : 'bg-white/5 border-white/10'}`}>
            {checked && <span className="material-icons text-black text-sm font-black">check</span>}
        </div>
        <p className="text-white/40 text-[10px] font-black uppercase tracking-tight leading-relaxed">{label}</p>
    </button>
);

export default SellerApplication;
