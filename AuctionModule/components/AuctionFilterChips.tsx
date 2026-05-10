import React from 'react';

interface FilterChip {
    id: string;
    label: string;
    icon: string;
}

const filters: FilterChip[] = [
    { id: 'live', label: 'AO VIVO', icon: 'sensors' },
    { id: 'ending', label: 'ENCERRANDO', icon: 'timer' },
    { id: 'new', label: 'NOVOS', icon: 'fiber_new' },
    { id: 'favorites', label: 'FAVORITOS', icon: 'star' },
    { id: 'verified', label: 'HARAS VERIFICADOS', icon: 'verified' },
];

interface AuctionFilterChipsProps {
    activeFilter: string;
    onFilterChange: (id: string) => void;
}

const AuctionFilterChips: React.FC<AuctionFilterChipsProps> = ({ activeFilter, onFilterChange }) => {
    return (
        <div className="px-6 mb-6 overflow-x-auto hide-scrollbar flex gap-3">
            {filters.map((filter) => (
                <button
                    key={filter.id}
                    onClick={() => onFilterChange(filter.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-full whitespace-nowrap transition-all duration-300 border ${
                        activeFilter === filter.id
                            ? 'bg-[#ECA413] border-[#ECA413] text-black shadow-lg shadow-[#ECA413]/20 scale-105'
                            : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'
                    }`}
                >
                    <span className={`material-icons text-sm ${activeFilter === filter.id ? 'text-black' : 'text-[#ECA413]/60'}`}>
                        {filter.icon}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest">
                        {filter.label}
                    </span>
                </button>
            ))}
        </div>
    );
};

export default AuctionFilterChips;
