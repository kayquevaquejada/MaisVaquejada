import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '../types';
import { TERMS_VERSION, PRIVACY_VERSION, SUPPORT_WHATSAPP, SUPPORT_EMAIL } from '../lib/constants';

interface LegalConsentViewProps {
  user: User | null;
  onAccept: () => void;
}

const LegalConsentView: React.FC<LegalConsentViewProps> = ({ user, onAccept }) => {
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showFullTerms, setShowFullTerms] = useState(false);
  const [showFullPrivacy, setShowFullPrivacy] = useState(false);

  const handleFinalize = async () => {
    if (!acceptedTerms || !acceptedPrivacy || !user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_legal_acceptances')
        .insert({
          user_id: user.id,
          accepted_terms: true,
          accepted_privacy: true,
          terms_version: TERMS_VERSION,
          privacy_version: PRIVACY_VERSION,
          accepted_method: user.signup_provider === 'google' ? 'google_first_login' : 'email_first_login',
          accepted_user_agent: window.navigator.userAgent
        });

      if (error) throw error;
      
      // Salvar localmente para evitar loop de carregamento
      localStorage.setItem(`arena_legal_accepted_${user.id}`, `${TERMS_VERSION}_${PRIVACY_VERSION}`);

      // Opcional: Atualizar cache do perfil se necessário
      await supabase
        .from('profiles')
        .update({ profile_completed: true }) // Marcar como completo se necessário? 
        // Na verdade o requisito diz que é uma etapa ANTES de concluir o primeiro acesso.
        .eq('id', user.id);

      onAccept();
    } catch (err: any) {
      alert('Erro ao registrar aceite: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const ExpandableCard = ({ title, date, children, isOpen, onToggle }: any) => (
    <div className="bg-white/5 border border-white/10 rounded-[32px] overflow-hidden transition-all duration-300">
      <div 
        onClick={onToggle}
        className="p-6 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
      >
        <div>
          <h3 className="text-white font-black uppercase text-xs tracking-widest">{title}</h3>
          <p className="text-[#ECA413] text-[9px] font-black uppercase tracking-tighter mt-1">Última atualização: {date}</p>
        </div>
        <span className={`material-icons text-[#ECA413] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </div>
      
      {isOpen && (
        <div className="px-6 pb-8 animate-in fade-in slide-in-from-top-4">
          <div className="h-[300px] overflow-y-auto pr-2 custom-scrollbar bg-black/20 rounded-2xl p-4 text-xs text-white/70 leading-relaxed space-y-4">
            {children}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0F0A05] flex flex-col relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#ECA413]/5 rounded-full blur-[120px] -mr-64 -mt-64 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#ECA413]/5 rounded-full blur-[120px] -ml-64 -mb-64 pointer-events-none" />

      <div className="flex-1 overflow-y-auto px-6 py-12 relative z-10 max-w-2xl mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-12 animate-in fade-in slide-in-from-top-8 duration-700">
          <div className="flex justify-center mb-6">
            <p className="font-black tracking-tighter italic leading-none flex items-baseline">
              <span className="text-[#ECA413]" style={{ fontSize: '3rem', lineHeight: 1, marginRight: '-0.1em' }}>+V</span>
              <span className="text-white text-[1.8rem] tracking-tight">AQUEJADA</span>
            </p>
          </div>
          <h1 className="text-2xl font-black text-white italic tracking-tighter uppercase mb-2">Consentimento Legal</h1>
          <p className="text-white/40 text-xs font-medium max-w-[280px] mx-auto leading-relaxed">
            Antes de continuar, leia e aceite nossos Termos de Uso e nossa Política de Privacidade.
          </p>
        </div>

        {/* Action Cards */}
        <div className="space-y-6 mb-10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
          <ExpandableCard 
            title="Termos de Uso e EULA" 
            date="16 de abril de 2026"
            isOpen={showFullTerms}
            onToggle={() => setShowFullTerms(!showFullTerms)}
          >
            <p className="font-black text-white uppercase text-[10px] mb-2">1. ACEITAÇÃO DOS TERMOS</p>
            <p>Ao utilizar o aplicativo +Vaquejada, o usuário concorda em cumprir estes Termos de Uso e o Contrato de Licença de Usuário Final (EULA). Caso não concorde, não deverá utilizar a plataforma.</p>
            
            <p className="font-black text-white uppercase text-[10px] mb-2 mt-4">2. OBJETO</p>
            <p>O +Vaquejada é uma plataforma digital criada com o propósito de fortalecer, valorizar e conectar o universo da vaquejada por meio da tecnologia, da informação e da comunicação moderna.</p>
            
            <p className="font-black text-white uppercase text-[10px] mb-2 mt-4">3. CADASTRO E ACESSO</p>
            <p>O acesso ao aplicativo poderá ocorrer por login social, incluindo Google e Facebook. O usuário declara que as informações fornecidas são verdadeiras e atualizadas.</p>
            
            <p className="font-black text-white uppercase text-[10px] mb-2 mt-4">4. CONTEÚDO GERADO PELO USUÁRIO</p>
            <p>A plataforma poderá permitir o compartilhamento de fotos, vídeos, comentários, interações e outros materiais. O usuário é o único responsável pelo conteúdo que publicar.</p>
            
            <p className="font-black text-white uppercase text-[10px] mb-2 mt-4">5. CONDUTAS PROIBIDAS</p>
            <p>É proibido publicar, compartilhar, promover ou manter no aplicativo: nudez, pornografia, discurso de ódio, bullying, conteúdos ilícitos ou abusivos.</p>
            
            <p className="font-black text-white uppercase text-[10px] mb-2 mt-4">6. MODERAÇÃO E SEGURANÇA</p>
            <p>A plataforma poderá adotar mecanismos de denúncia e remoção de conteúdos, bem como suspensão de usuários que violem estes Termos.</p>
          </ExpandableCard>

          <ExpandableCard 
            title="Política de Privacidade" 
            date="16 de abril de 2026"
            isOpen={showFullPrivacy}
            onToggle={() => setShowFullPrivacy(!showFullPrivacy)}
          >
            <p>A presente Política de Privacidade descreve como o aplicativo +Vaquejada coleta, utiliza, armazena e protege os dados dos usuários, em conformidade com a LGPD.</p>
            
            <p className="font-black text-white uppercase text-[10px] mb-2 mt-4">1. DADOS COLETADOS</p>
            <p>Podemos coletar: Nome, e-mail, foto de perfil, dados fornecidos, conteúdos publicados e informações técnicas (IP, dispositivo).</p>
            
            <p className="font-black text-white uppercase text-[10px] mb-2 mt-4">2. COMO USAMOS OS DADOS</p>
            <p>Funcionamento do app, identificação do usuário, melhoria da experiência, exibição de anúncios e segurança.</p>
            
            <p className="font-black text-white uppercase text-[10px] mb-2 mt-4">3. COMPARTILHAMENTO</p>
            <p>O +Vaquejada não vende dados pessoais. Compartilhamos apenas com serviços de infraestrutura e autoridades legais quando exigido.</p>
            
            <p className="font-black text-white uppercase text-[10px] mb-2 mt-4">4. SEUS DIREITOS</p>
            <p>Nos termos da LGPD, você pode solicitar acesso, correção ou exclusão de seus dados a qualquer momento.</p>
          </ExpandableCard>
        </div>

        {/* Checkboxes */}
        <div className="space-y-4 mb-10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-400">
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-md border text-black flex items-center justify-center transition-all ${acceptedTerms ? 'bg-[#ECA413] border-[#ECA413]' : 'bg-transparent border-white/20 group-hover:border-white/40'}`}>
              {acceptedTerms && <span className="material-icons text-[16px] font-black">check</span>}
            </div>
            <input type="checkbox" className="hidden" checked={acceptedTerms} onChange={() => setAcceptedTerms(!acceptedTerms)} />
            <span className="text-xs font-medium text-white/70 group-hover:text-white transition-colors">
              Li e aceito os <span className="text-[#ECA413] font-black">Termos de Uso</span> e o <span className="text-[#ECA413] font-black">EULA</span> do +Vaquejada.
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer group">
            <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-md border text-black flex items-center justify-center transition-all ${acceptedPrivacy ? 'bg-[#ECA413] border-[#ECA413]' : 'bg-transparent border-white/20 group-hover:border-white/40'}`}>
              {acceptedPrivacy && <span className="material-icons text-[16px] font-black">check</span>}
            </div>
            <input type="checkbox" className="hidden" checked={acceptedPrivacy} onChange={() => setAcceptedPrivacy(!acceptedPrivacy)} />
            <span className="text-xs font-medium text-white/70 group-hover:text-white transition-colors">
              Li e aceito a <span className="text-[#ECA413] font-black">Política de Privacidade</span> do +Vaquejada.
            </span>
          </label>

          <p className="text-[10px] font-black text-[#ECA413] uppercase tracking-widest mt-6 bg-[#ECA413]/10 p-4 rounded-2xl border border-[#ECA413]/20">
            ⚠ Você só poderá continuar após aceitar os documentos acima.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500">
          <button 
            disabled={!acceptedTerms || !acceptedPrivacy || loading}
            onClick={handleFinalize}
            className={`w-full py-5 rounded-[24px] font-black text-[11px] uppercase tracking-widest transition-all shadow-xl shadow-black/40 ${acceptedTerms && acceptedPrivacy ? 'bg-[#ECA413] text-black active:scale-95' : 'bg-white/5 text-white/20'}`}
          >
            {loading ? 'Processando...' : 'Finalizar Cadastro'}
          </button>
          
          <button 
            onClick={() => supabase.auth.signOut()}
            className="w-full py-5 rounded-[24px] font-black text-[11px] uppercase tracking-widest text-white/40 hover:text-white transition-all flex items-center justify-center gap-2"
          >
            Sair da Conta
          </button>
        </div>

        {/* Support Footer */}
        <div className="mt-16 pt-8 border-t border-white/5 text-center">
          <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mb-4">Suporte Institucional</p>
          <div className="flex justify-center gap-4">
            <button 
              onClick={() => window.open(`https://wa.me/${SUPPORT_WHATSAPP}`, '_blank')}
              className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full hover:bg-white/10 transition-all"
            >
              <span className="material-icons text-xs text-[#ECA413]">chat</span>
              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">WhatsApp</span>
            </button>
            <button 
              onClick={() => window.open(`mailto:${SUPPORT_EMAIL}`, '_blank')}
              className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full hover:bg-white/10 transition-all"
            >
              <span className="material-icons text-xs text-[#ECA413]">mail</span>
              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">E-mail</span>
            </button>
          </div>
          <p className="text-[8px] font-black text-white/10 uppercase tracking-[0.4em] mt-10">Versão Legal {TERMS_VERSION} / {PRIVACY_VERSION}</p>
        </div>
      </div>
    </div>
  );
};

export default LegalConsentView;
