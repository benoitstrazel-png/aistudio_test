import React from 'react';
import { Info } from 'lucide-react';

const InfoTooltip = ({ text, className = "ml-2" }) => {
    return (
        <div className={`group relative inline-block ${className} cursor-help`}>
            <Info size={16} className="text-secondary hover:text-accent transition-colors" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-xs text-secondary rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all w-48 z-50 border border-slate-700 shadow-xl pointer-events-none">
                {text}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
            </div>
        </div>
    );
};

export default InfoTooltip;
