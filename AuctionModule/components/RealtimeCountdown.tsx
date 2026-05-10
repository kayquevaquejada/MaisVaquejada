import React, { useState, useEffect } from 'react';

interface RealtimeCountdownProps {
    endDate: string;
    showSeconds?: boolean;
}

const RealtimeCountdown: React.FC<RealtimeCountdownProps> = ({ endDate, showSeconds = true }) => {
    const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);

    useEffect(() => {
        const calculateTimeLeft = () => {
            const difference = +new Date(endDate) - +new Date();
            
            if (difference > 0) {
                setTimeLeft({
                    d: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    h: Math.floor((difference / (1000 * 60 * 60)) % 24),
                    m: Math.floor((difference / 1000 / 60) % 60),
                    s: Math.floor((difference / 1000) % 60)
                });
            } else {
                setTimeLeft(null);
            }
        };

        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 1000);
        return () => clearInterval(timer);
    }, [endDate]);

    if (!timeLeft) {
        return <span className="text-red-500 font-black uppercase tracking-widest text-[10px]">Encerrado</span>;
    }

    const { d, h, m, s } = timeLeft;
    const totalMinutes = d * 24 * 60 + h * 60 + m;

    let textColorClass = 'text-white/60';
    let pulseClass = '';

    if (totalMinutes <= 1) {
        textColorClass = 'text-red-500';
        pulseClass = 'animate-pulse';
    } else if (totalMinutes <= 10) {
        textColorClass = 'text-orange-500';
    } else if (totalMinutes <= 60) {
        textColorClass = 'text-[#ECA413]';
    }

    return (
        <div className={`flex items-center gap-1.5 font-black uppercase tracking-tighter ${textColorClass} ${pulseClass}`}>
            <div className="flex flex-col items-center">
                <span>{d.toString().padStart(2, '0')}d</span>
            </div>
            <span>:</span>
            <div className="flex flex-col items-center">
                <span>{h.toString().padStart(2, '0')}h</span>
            </div>
            <span>:</span>
            <div className="flex flex-col items-center">
                <span>{m.toString().padStart(2, '0')}m</span>
            </div>
            {showSeconds && (
                <>
                    <span>:</span>
                    <div className="flex flex-col items-center min-w-[20px]">
                        <span>{s.toString().padStart(2, '0')}s</span>
                    </div>
                </>
            )}
        </div>
    );
};

export default RealtimeCountdown;
