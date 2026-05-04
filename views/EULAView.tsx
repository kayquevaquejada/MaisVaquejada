import React from 'react';

interface EULAViewProps {
  onBack: () => void;
}

const EULAView: React.FC<EULAViewProps> = ({ onBack }) => {
  return (
    <div className="min-h-full flex flex-col bg-[#0F0A05] text-white p-6 pb-12 overflow-y-auto">
      <div className="flex items-center gap-4 mb-8 sticky top-0 bg-[#0F0A05]/95 backdrop-blur py-4 z-10">
        <button 
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center active:scale-95 transition-all"
        >
          <span className="material-icons text-[#ECA413]">arrow_back</span>
        </button>
        <h1 className="text-xl font-black uppercase italic tracking-tighter">Termos e EULA</h1>
      </div>

      <div className="space-y-6 text-sm text-white/70 font-medium leading-relaxed">
        <section>
          <h2 className="text-[#ECA413] font-black uppercase text-xs tracking-widest mb-2">1. Aceitação dos Termos</h2>
          <p>Ao utilizar o aplicativo +Vaquejada, você concorda em cumprir estes Termos de Uso e o Contrato de Licença de Usuário Final (EULA). Se você não concordar, não utilize o aplicativo.</p>
        </section>

        <section>
          <h2 className="text-[#ECA413] font-black uppercase text-xs tracking-widest mb-2">2. Conteúdo Gerado pelo Usuário (UGC)</h2>
          <p>O +Vaquejada permite que os usuários compartilhem fotos, vídeos e comentários. Você é o único responsável pelo conteúdo que publica.</p>
          <div className="mt-2 p-4 bg-red-500/5 border border-red-500/10 rounded-2xl">
            <p className="font-bold text-red-200 mb-2 underline">Tolerância Zero para Conteúdo Abusivo:</p>
            <ul className="list-disc pl-4 space-y-1 text-xs">
              <li>É proibido conteúdo de nudez, pornografia ou sexualmente explícito.</li>
              <li>É proibido discursos de ódio, assédio, bullying ou ameaças.</li>
              <li>É proibido conteúdo que promova atividades ilegais.</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-[#ECA413] font-black uppercase text-xs tracking-widest mb-2">3. Moderação e Segurança</h2>
          <p>Para garantir uma comunidade segura, implementamos as seguintes ferramentas:</p>
          <ul className="list-disc pl-4 space-y-2 mt-2">
            <li><strong>Denúncia:</strong> Os usuários podem denunciar qualquer conteúdo ou perfil que viole estas regras através do botão de "Denunciar".</li>
            <li><strong>Bloqueio:</strong> Você pode bloquear qualquer usuário a qualquer momento para deixar de ver o conteúdo dele e impedir interações.</li>
            <li><strong>Ação da Equipe:</strong> Nossa equipe revisa denúncias em até 24h e removerá conteúdo impróprio e/ou banirá usuários infratores permanentemente.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-[#ECA413] font-black uppercase text-xs tracking-widest mb-2">4. Licença de Uso</h2>
          <p>Concedemos a você uma licença pessoal, não exclusiva e intransferível para usar o aplicativo em seus dispositivos Apple ou Android, conforme as regras de cada loja.</p>
        </section>

        <section>
          <h2 className="text-[#ECA413] font-black uppercase text-xs tracking-widest mb-2">5. Privacidade</h2>
          <p>Sua privacidade é importante. Seus dados são processados de acordo com nossa Política de Privacidade disponível em nosso site oficial.</p>
        </section>

        <p className="text-[10px] text-center pt-8 opacity-40">Última atualização: 11 de Abril de 2026</p>
      </div>
    </div>
  );
};

export default EULAView;
