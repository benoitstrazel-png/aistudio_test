import React from 'react';
import { getTeamLogo } from '../../utils/logos';

const TeamLogo = ({ teamName, size = 'md', className = '' }) => {
    const logoUrl = getTeamLogo(teamName);

    // Taille fixe en pixels pour contraindre les SVG
    const pixelSize = {
        sm: 24,
        md: 40,
        lg: 64,
        xl: 96
    };

    const s = pixelSize[size] || 40;

    return (
        <div
            className={`flex items-center justify-center bg-white/5 rounded-full p-1 shrink-0 ${className}`}
            style={{ width: `${s + 8}px`, height: `${s + 8}px` }} // Container légèrement plus grand + padding
        >
            <img
                src={logoUrl}
                alt={teamName}
                style={{
                    width: `${s}px`,
                    height: `${s}px`,
                    maxWidth: `${s}px`,
                    maxHeight: `${s}px`,
                    objectFit: 'contain'
                }}
                loading="lazy"
                onError={(e) => {
                    e.target.style.display = 'none';
                    if (e.target.parentElement) {
                        e.target.parentElement.innerText = teamName?.substring(0, 3).toUpperCase();
                        e.target.parentElement.classList.add('text-[10px]', 'font-bold', 'text-white');
                    }
                }}
            />
        </div>
    );
};

export default TeamLogo;
