import React, { useState } from 'react';
import { getLeagueLogo } from '../utils/logos';

const AuthPage = ({ onLogin }) => {
    const [isRegistering, setIsRegistering] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');

    const handleLogin = (e) => {
        e.preventDefault();
        // Simulation of secure credentials - In a real app, this goes to a backend
        if (username.toLowerCase() === 'admin' && password === 'admin') {
            onLogin();
        } else {
            setError('Identifiant ou mot de passe incorrect.');
        }
    };

    const handleRequestAccess = (e) => {
        e.preventDefault();

        // Prepare mailto link
        const subject = `Demande d'accès Ligue 1 Predictor - ${username}`;
        const body = `Bonjour Admin,\n\nJe souhaite accéder à la plateforme.\n\nIdentifiant souhaité: ${username}\nEmail: ${email}\n\nMerci de valider mon accès.`;

        const mailtoLink = `mailto:ligue1predictor@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

        // Open mail client
        window.location.href = mailtoLink;

        alert("Votre client mail va s'ouvrir pour envoyer la demande. Une fois envoyée, l'administrateur vous contactera.");
        // Switch back to login
        setIsRegistering(false);
    };

    return (
        <div className="min-h-screen bg-[#0B1426] flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-accent/5 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#CEF002]/5 rounded-full blur-[100px]"></div>
            </div>

            <div className="z-10 w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl">

                {/* Logo & Header */}
                <div className="text-center mb-8">
                    <img
                        src={getLeagueLogo()}
                        alt="Ligue 1"
                        className="h-10 w-auto mx-auto mb-4 drop-shadow-[0_0_15px_rgba(206,240,2,0.3)]"
                    />
                    <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter">
                        Ligue 1 <span className="text-accent not-italic">Predictor Access</span>
                    </h1>
                    <p className="text-secondary text-sm mt-2">Plateforme d'analyse prédictive sécurisée</p>
                </div>

                {/* Form */}
                {isRegistering ? (
                    <form onSubmit={handleRequestAccess} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-accent uppercase">Identifiant Souhaité</label>
                            <input
                                type="text"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="bg-black/40 border border-white/10 rounded p-3 text-white focus:border-accent outline-none transition-colors"
                                placeholder="Votre pseudo"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-accent uppercase">Email de contact</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="bg-black/40 border border-white/10 rounded p-3 text-white focus:border-accent outline-none transition-colors"
                                placeholder="votre@email.com"
                            />
                        </div>

                        <button type="submit" className="mt-4 bg-accent hover:bg-white text-black font-black py-3 rounded uppercase tracking-widest transition-all hover:scale-105 shadow-[0_0_20px_rgba(206,240,2,0.3)]">
                            Demander l'accès
                        </button>

                        <p className="text-center text-secondary text-xs mt-4">
                            Déjà un compte ? <button type="button" onClick={() => setIsRegistering(false)} className="text-white hover:underline font-bold">Se connecter</button>
                        </p>
                    </form>
                ) : (
                    <form onSubmit={handleLogin} className="flex flex-col gap-4">
                        {error && <div className="bg-red-500/20 border border-red-500/50 text-red-200 text-sm p-3 rounded text-center">{error}</div>}

                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-accent uppercase">Identifiant</label>
                            <input
                                type="text"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="bg-black/40 border border-white/10 rounded p-3 text-white focus:border-accent outline-none transition-colors"
                                placeholder="admin"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-accent uppercase">Mot de Passe</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="bg-black/40 border border-white/10 rounded p-3 text-white focus:border-accent outline-none transition-colors"
                                placeholder="••••••••"
                            />
                        </div>

                        <button type="submit" className="mt-4 bg-white hover:bg-accent text-black font-black py-3 rounded uppercase tracking-widest transition-all hover:scale-105">
                            Entrer
                        </button>

                        <p className="text-center text-secondary text-xs mt-4">
                            Pas encore d'accès ? <button type="button" onClick={() => setIsRegistering(true)} className="text-accent hover:underline font-bold">Faire une demande</button>
                        </p>
                    </form>
                )}
            </div>

            <footer className="absolute bottom-4 text-center text-[10px] text-white/20 uppercase tracking-[0.2em]">
                Secure System v1.0 • 2025-2026
            </footer>
        </div>
    );
};

export default AuthPage;
