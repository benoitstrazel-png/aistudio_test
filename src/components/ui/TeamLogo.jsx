import React from 'react';
import { getTeamLogo } from '../../utils/logos';

const TeamLogo = ({ teamName, size = 'md', className = '' }) => {
    const logoUrl = getTeamLogo(teamName);

    // Explicit sizing objects to prevent CSS conflicts
    const sizeStyles = {
        sm: { width: '24px', height: '24px', minWidth: '24px' },
        md: { width: '40px', height: '40px', minWidth: '40px' },
        lg: { width: '64px', height: '64px', minWidth: '64px' },
        xl: { width: '96px', height: '96px', minWidth: '96px' }
    };

    return (
        <div
            className={`flex items-center justify-center bg-white/5 rounded-full p-1.5 shrink-0 ${className}`}
            style={sizeStyles[size]}
        >
            <img
                src={logoUrl}
                alt={teamName}
                className="w-full h-full object-contain drop-shadow-md"
                loading="lazy"
                onError={(e) => {
                    // Fallback if image fails: Hide img and show initials
                    e.target.style.display = 'none';
                    const parent = e.target.parentElement;
                    if (parent) {
                        parent.innerText = teamName?.substring(0, 3).toUpperCase();
                        parent.classList.add('text-[10px]', 'font-bold', 'text-white');
                    }
                }}
            />
        </div>
    );
};

export default TeamLogo;
