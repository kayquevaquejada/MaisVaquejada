import React, { useState } from 'react';

interface LandingPageViewProps {
  onEnterApp: () => void;
  apkUrl: string;
}

const LandingPageView: React.FC<LandingPageViewProps> = ({ onEnterApp, apkUrl }) => {
  const [showIosGuide, setShowIosGuide] = useState(false);

  const features = [
    { icon: 'newspaper', title: 'Notícias', desc: 'Fique por dentro de tudo que acontece no mundo das vaquejadas.' },
    { icon: 'event', title: 'Eventos', desc: 'Calendário completo das melhores provas e prêmios.' },
    { icon: 'shopping_bag', title: 'Mercado', desc: 'Compre e venda cavalos, equipamentos e serviços.' },
    { icon: 'groups', title: 'Comunidade', desc: 'Conecte-se com milhares de apaixonados pela cultura.' },
  ];

  return (
    <div className="min-h-screen bg-[#0F0A05] text-white selection:bg-[#ECA413] selection:text-black font-sans">
      {/* Background Cinematográfico */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-[#0F0A05]/90 to-[#0F0A05] z-10" />
        <img
          src="https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80"
          className="w-full h-full object-cover opacity-50"
          alt="Vaquejada Background"
        />
      </div>

      <div className="relative z-20 max-w-7xl mx-auto px-6 pt-12 pb-20">
        {/* Header/Logo OFICIAL */}
        <div className="flex flex-col items-center mb-16 animate-in fade-in slide-in-from-top-10 duration-1000">
          <div className="inline-block px-4 py-1.5 rounded-full bg-[#ECA413]/10 border border-[#ECA413]/20 mb-8">
            <span className="text-[#ECA413] text-[10px] font-black uppercase tracking-[0.4em]">Arena Digital Oficial</span>
          </div>
          
          <div className="relative group mb-8">
            <div className="absolute inset-0 bg-[#ECA413]/10 blur-3xl rounded-full scale-125 group-hover:scale-150 transition-transform duration-1000" />
            <p className="font-black tracking-tighter italic leading-none flex items-baseline justify-center relative z-10 drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
              <span className="text-[#ECA413]" style={{ fontSize: '5rem', lineHeight: 1, marginRight: '-0.1em' }}>+V</span>
              <span className="text-white tracking-tight" style={{ fontSize: '3.5rem' }}>AQUEJADA</span>
            </p>
          </div>

          
          <p className="text-white/60 text-lg md:text-xl font-medium max-w-2xl text-center leading-relaxed italic">
            A maior plataforma digital dedicada à paixão que move o Nordeste. 
            Tudo o que você precisa em um só lugar.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-32 max-w-4xl mx-auto">
          {/* Android Button */}
          <a
            href={apkUrl}
            className="group relative bg-white text-black p-8 rounded-[32px] overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="material-icons text-8xl">android</span>
            </div>
            <div className="relative z-10">
              <span className="text-[10px] font-bold uppercase tracking-widest text-black/40 mb-2 block">Disponível para</span>
              <h3 className="text-2xl font-black uppercase italic leading-none mb-4">Android</h3>
              <p className="text-xs font-bold leading-tight opacity-60">Baixar arquivo APK direto em seu dispositivo.</p>
            </div>
          </a>

          {/* iOS Button */}
          <button
            onClick={() => setShowIosGuide(true)}
            className="group relative bg-[#1A1108] border border-white/10 p-8 rounded-[32px] overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="material-icons text-8xl">apple</span>
            </div>
            <div className="relative z-10 text-left">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#ECA413] mb-2 block">Instalação via</span>
              <h3 className="text-2xl font-black uppercase italic leading-none mb-4">iPhone</h3>
              <p className="text-xs font-bold leading-tight text-white/40">Adicionar ícone oficial à sua tela de início.</p>
            </div>
          </button>

          {/* Web Button */}
          <button
            onClick={onEnterApp}
            className="group relative bg-[#ECA413] text-black p-8 rounded-[32px] overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_20px_40px_rgba(234,164,19,0.3)]"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="material-icons text-8xl">language</span>
            </div>
            <div className="relative z-10 text-left">
              <span className="text-[10px] font-bold uppercase tracking-widest text-black/40 mb-2 block">Acesso Imediato</span>
              <h3 className="text-2xl font-black uppercase italic leading-none mb-4">Entrar Web</h3>
              <p className="text-xs font-bold leading-tight opacity-60">Usar a Arena diretamente pelo seu navegador.</p>
            </div>
          </button>
        </div>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-32">
          {features.map((f, i) => (
            <div key={i} className="bg-white/5 backdrop-blur-md border border-white/5 p-8 rounded-[40px] hover:bg-white/10 transition-colors">
              <div className="w-14 h-14 bg-[#ECA413]/10 rounded-2xl flex items-center justify-center mb-6 border border-[#ECA413]/20 text-[#ECA413]">
                <span className="material-icons text-3xl">{f.icon}</span>
              </div>
              <h4 className="text-xl font-black uppercase italic tracking-tighter mb-4">{f.title}</h4>
              <p className="text-white/40 text-sm leading-relaxed font-medium">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.5em]">Arena Vaquerama © 2026 - Todos os Direitos Reservados</p>
        </div>
      </div>

      {/* iOS Modal Guide */}
      {showIosGuide && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-[#1A1108] border border-white/10 rounded-[40px] max-w-md w-full p-10 relative shadow-[0_0_100px_rgba(234,164,19,0.1)]">
            <button onClick={() => setShowIosGuide(false)} className="absolute top-6 right-6 p-2 rounded-full bg-white/5 text-white/40 hover:text-white transition-colors">
              <span className="material-icons">close</span>
            </button>
            <div className="text-center mb-8">
              <div className="flex justify-center mb-6">
                <p className="font-black tracking-tighter italic leading-none flex items-baseline">
                  <span className="text-[#ECA413]" style={{ fontSize: '3rem', lineHeight: 1, marginRight: '-0.1em' }}>+V</span>
                  <span className="text-white text-[2rem] tracking-tight">AQUEJADA</span>
                </p>
              </div>
              <h3 className="text-2xl font-black uppercase italic tracking-tight mb-2">Instalar no iPhone</h3>
              <p className="text-white/40 text-xs font-bold">Tenha o app oficial na palma da mão sem usar a App Store.</p>
            </div>
            
            <div className="space-y-6 mb-10">
              <div className="flex items-center gap-6">
                <div className="w-8 h-8 rounded-full bg-[#ECA413] text-black flex items-center justify-center font-black text-xs">1</div>
                <p className="text-sm font-bold text-white/80">Toque no ícone de <span className="text-[#ECA413]">Compartilhar</span> na barra de baixo do Safari.</p>
              </div>
              <div className="flex items-center gap-6">
                <div className="w-8 h-8 rounded-full bg-[#ECA413] text-black flex items-center justify-center font-black text-xs">2</div>
                <p className="text-sm font-bold text-white/80">Role para baixo e toque em <span className="text-[#ECA413]">"Adicionar à Tela de Início"</span>.</p>
              </div>
              <div className="flex items-center gap-6">
                <div className="w-8 h-8 rounded-full bg-[#ECA413] text-black flex items-center justify-center font-black text-xs">3</div>
                <p className="text-sm font-bold text-white/80">Confirme o nome e pronto! O ícone da <span className="text-[#ECA413]">Arena</span> aparecerá no seu menu.</p>
              </div>
            </div>

            <button
              onClick={() => setShowIosGuide(false)}
              className="w-full bg-white text-black py-4 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:scale-105 transition-all"
            >
              ENTENDI, VAMO PRO BOI!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPageView;
