import React, { useState } from 'react';
import { getTeamLogo } from '../../utils/logos';

const TeamLogo = ({ teamName, size = 'md', className = '' }) => {
    const logoUrl = getTeamLogo(teamName);
    const [hasError, setHasError] = useState(false);

    // Taille fixe en pixels
    const pixelSize = {
        sm: 24,
        md: 40,
        lg: 64,
        xl: 96
    };

    const s = pixelSize[size] || 40;

    // Fallback content (Initials)
    const initials = teamName ? teamName.substring(0, 2).toUpperCase() : 'FC';

    // Random colorful background for fallback based on team name
    const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500'];
    const bgClass = hasError ? colors[teamName.length % colors.length] : 'bg-white/5';

    if (hasError) {
        return (
            <div
                className={`flex items-center justify-center rounded-full shrink-0 ${bgClass} ${className}`}
                style={{ width: `${s}px`, height: `${s}px`, minWidth: `${s}px` }}
                title={teamName}
            >
                <span className="text-white font-bold" style={{ fontSize: `${s * 0.4}px` }}>
                    {initials}
                </span>
            </div>
        );
    }

    return (
        <div
            className={`flex items-center justify-center bg-white/5 rounded-full p-1.5 shrink-0 ${className}`}
            style={{ width: `${s + 8}px`, height: `${s + 8}px` }}
        >
            <img
                src={logoUrl}
                alt={teamName}
                style={{
                    width: `${s}px`,
                    height: `${s}px`,
                    objectFit: 'contain'
                }}
                onError={() => setHasError(true)}
            />
        </div>
    );
};

export default TeamLogo;
