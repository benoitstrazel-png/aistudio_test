import React, { useMemo } from 'react';
import TeamLogo from './ui/TeamLogo';

const ExpertAnalysis = ({ nextMatches }) => {

    // Generate editorial content based on match data
    const articles = useMemo(() => {
        if (!nextMatches || nextMatches.length === 0) return [];

        const news = nextMatches.map(match => {
            const isBigMatch = (match.odds?.home < 2.5 && match.odds?.away < 2.5) || (['PSG', 'Marseille', 'Lyon', 'Monaco', 'Lens', 'Lille'].includes(match.homeTeam) && ['PSG', 'Marseille', 'Lyon', 'Monaco', 'Lens', 'Lille'].includes(match.awayTeam));

            let title = "";
            let snippet = "";
            let tag = "Ligue 1";
            let time = "Il y a 2h";

            // Logic to generate L'Equipe-style headlines
            if (isBigMatch) {
                tag = "Le Choc";
                title = `${match.homeTeam}-${match.awayTeam} : Le tournant de la saison ?`;
                snippet = `Gros test pour ${match.homeTeam} qui reçoit une équipe de ${match.awayTeam} ambitieuse. Les statistiques prédisent un match serré (${match.prediction?.score || '?-?'}) où chaque détail comptera.`;
            } else if (match.prediction?.winner === match.homeTeam && match.prediction.confidence > 65) {
                tag = "Favori";
                title = `${match.homeTeam} a une voie royale face à ${match.awayTeam}`;
                snippet = `La dynamique est clairement du côté des locaux. Nos experts voient mal comment ${match.awayTeam} pourrait repartir avec des points, sauf exploit monumental.`;
            } else if (match.probs && Math.abs(match.probs['1'] - match.probs['2']) < 0.05) {
                tag = "Indécis";
                title = `Suspense total au programme entre ${match.homeTeam} et ${match.awayTeam}`;
                snippet = `C'est le match piège par excellence de cette journée. Les bookmakers n'arrivent pas à trancher, et notre modèle prévoit un score de parité.`;
            } else {
                tag = "Avant-match";
                title = `${match.homeTeam} - ${match.awayTeam} : Les compositions probables`;
                snippet = `Zoom sur les forces en présence. L'enjeu est de taille pour le milieu de tableau. Découvrez les clés tactiques de la rencontre.`;
            }

            return {
                id: match.id,
                match,
                title,
                snippet,
                tag,
                time
            };
        });

        // Sort by "importance" (Big Match first) and take top 4
        return news.sort((a, b) => (a.tag === 'Le Choc' ? -1 : 1)).slice(0, 4);

    }, [nextMatches]);

    return (
        <div className="card border-t-4 border-red-600 bg-white text-black mt-8">
            <div className="flex items-center justify-between mb-6 border-b border-gray-200 pb-4">
                <div className="flex items-center gap-4">
                    {/* Fake L'Equipe Logo */}
                    <div className="font-black text-3xl italic text-red-600 tracking-tighter" style={{ fontFamily: 'Impact, sans-serif' }}>
                        L'ÉQUIPE
                    </div>
                    <span className="text-xs font-bold uppercase bg-red-600 text-white px-2 py-0.5 transform -skew-x-12">
                        L'actu de la J{nextMatches[0]?.week || 17}
                    </span>
                </div>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                    Analyse & Décryptage
                </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {articles.map((article, idx) => (
                    <div key={article.id} className="group cursor-pointer flex flex-col h-full">
                        {/* Image Placeholder with Team Logos */}
                        <div className="relative h-40 bg-slate-900 rounded overflow-hidden mb-3 border-b-4 border-transparent group-hover:border-red-600 transition-colors">
                            {/* Background Elements */}
                            <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-black opacity-80"></div>

                            {/* Teams Face-off Visual */}
                            <div className="absolute inset-0 flex items-center justify-center gap-8">
                                <div className="transform scale-150 drop-shadow-lg opacity-80 group-hover:opacity-100 group-hover:scale-175 transition-all duration-500">
                                    <TeamLogo teamName={article.match.homeTeam} size="lg" />
                                </div>
                                <div className="text-white/20 font-black text-4xl italic">VS</div>
                                <div className="transform scale-150 drop-shadow-lg opacity-80 group-hover:opacity-100 group-hover:scale-175 transition-all duration-500">
                                    <TeamLogo teamName={article.match.awayTeam} size="lg" />
                                </div>
                            </div>

                            {/* Tag */}
                            <div className="absolute top-2 left-2">
                                <span className={`text-[10px] font-bold uppercase py-1 px-2 rounded ${article.tag === 'Le Choc' ? 'bg-yellow-400 text-black' : 'bg-white text-black'
                                    }`}>
                                    {article.tag}
                                </span>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex flex-col flex-grow">
                            <h3 className="font-black text-lg leading-tight mb-2 group-hover:text-red-700 transition-colors">
                                {article.title}
                            </h3>
                            <p className="text-sm text-gray-600 leading-snug line-clamp-3 mb-3 flex-grow font-serif">
                                {article.snippet}
                            </p>
                            <div className="flex items-center text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-auto">
                                <span>{article.time}</span>
                                <span className="mx-2">•</span>
                                <span className="text-red-600">Abonnés</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ExpertAnalysis;
