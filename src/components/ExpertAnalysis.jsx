import React, { useMemo } from 'react';
import TeamLogo from './ui/TeamLogo';
import lequipeNews from '../data/lequipe_news.json';

const ExpertAnalysis = ({ nextMatches }) => {

    // Match editorial content to the actual upcoming matches
    const articles = useMemo(() => {
        if (!nextMatches || nextMatches.length === 0) return [];

        const matchedNews = [];

        nextMatches.forEach(match => {
            // Finding news that mentions both teams in any order
            const article = lequipeNews.find(news => {
                const titleMatch = news.match.includes(match.homeTeam) && news.match.includes(match.awayTeam);
                return titleMatch;
            });

            if (article) {
                matchedNews.push({
                    id: match.id,
                    match,
                    title: article.title,
                    snippet: article.snippet,
                    url: article.url,
                    tag: article.tag || "Ligue 1",
                    time: article.time || "Il y a 1h"
                });
            }
        });

        return matchedNews;

    }, [nextMatches]);

    if (articles.length === 0) return null;

    return (
        <div className="card border-t-4 border-red-600 bg-[#0B1426] text-white mt-8 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between mb-8 border-b border-white/5 p-6 pb-4">
                <div className="flex items-center gap-4">
                    {/* Fake L'Equipe Logo */}
                    <div className="font-black text-3xl italic text-red-600 tracking-tighter" style={{ fontFamily: 'Impact, sans-serif' }}>
                        L'ÉQUIPE
                    </div>
                    <span className="text-[10px] font-black uppercase bg-red-600 text-white px-2 py-0.5 transform -skew-x-12">
                        L'actu de la J{nextMatches[0]?.week || 17}
                    </span>
                </div>
                <div className="text-[10px] font-black text-secondary uppercase tracking-widest hidden sm:block">
                    Analyse & Décryptage • Données Réelles
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 p-6 pt-0">
                {articles.map((article) => (
                    <a
                        key={article.id}
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex flex-col h-full hover:bg-white/5 p-4 rounded-2xl transition-all duration-300 border border-transparent hover:border-white/5"
                    >
                        {/* Image Placeholder with Team Logos */}
                        <div className="relative h-44 bg-slate-900 rounded-xl overflow-hidden mb-4 border border-white/5 group-hover:scale-[1.02] transition-transform duration-500">
                            {/* Background Elements */}
                            <div className="absolute inset-0 bg-gradient-to-br from-[#1e293b] to-black opacity-90"></div>

                            {/* Texture overlay */}
                            <div className="absolute inset-0 opacity-10 mix-blend-overlay" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>

                            {/* Teams Face-off Visual */}
                            <div className="absolute inset-0 flex items-center justify-center gap-6">
                                <div className="transform scale-125 drop-shadow-2xl opacity-90 group-hover:opacity-100 group-hover:scale-140 transition-all duration-500">
                                    <TeamLogo teamName={article.match.homeTeam} size="lg" />
                                </div>
                                <div className="text-white/10 font-black text-3xl italic select-none">VS</div>
                                <div className="transform scale-125 drop-shadow-2xl opacity-90 group-hover:opacity-100 group-hover:scale-140 transition-all duration-500">
                                    <TeamLogo teamName={article.match.awayTeam} size="lg" />
                                </div>
                            </div>

                            {/* Tag */}
                            <div className="absolute top-3 left-3">
                                <span className={`text-[9px] font-black uppercase py-1 px-2 rounded-md shadow-lg ${article.tag === 'Le Choc' || article.tag === 'Le Derby' ? 'bg-[#CEF002] text-black' : 'bg-red-600 text-white'
                                    }`}>
                                    {article.tag}
                                </span>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex flex-col flex-grow">
                            <h3 className="font-black text-lg lg:text-xl leading-snug mb-3 group-hover:text-white transition-colors line-clamp-2 text-white">
                                {article.title}
                            </h3>
                            <p className="text-sm text-gray-400 leading-relaxed line-clamp-3 mb-4 flex-grow font-medium">
                                {article.snippet}
                            </p>
                            <div className="flex items-center justify-between text-[10px] text-gray-500 font-black uppercase tracking-widest mt-auto pt-4 border-t border-white/5">
                                <div className="flex items-center gap-3">
                                    <span className="bg-white/5 px-2 py-1 rounded text-gray-400">{article.time}</span>
                                    <span className="text-red-600 font-black">Abonnés</span>
                                </div>
                                <span className="group-hover:text-[#CEF002] transition-colors font-black">Lire la suite →</span>
                            </div>
                        </div>
                    </a>
                ))}
            </div>
        </div>
    );
};

export default ExpertAnalysis;
