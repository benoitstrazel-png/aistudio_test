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
        const subject = `Demande d'accès Ligue 1 Predictor - ${username}`;
        const body = `Bonjour Admin,\n\nJe souhaite accéder à la plateforme.\n\nIdentifiant souhaité: ${username}\nEmail: ${email}\n\nMerci de valider mon accès.`;
        const mailtoLink = `mailto:ligue1predictor@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailtoLink;
        alert("Votre client mail va s'ouvrir pour envoyer la demande. Une fois envoyée, l'administrateur vous contactera.");
        setIsRegistering(false);
    };

    return (
        <div className="min-h-screen flex flex-col md:flex-row font-sans">
            {/* LEFT SIDE - FORM */}
            <div className="w-full md:w-[45%] bg-white flex flex-col items-center justify-center p-8 relative">
                <div className="w-full max-w-sm flex flex-col items-center">

                    {/* Logo */}
                    <div className="mb-12">
                        <img
                            src={getLeagueLogo()}
                            alt="Ligue 1 Uber Eats"
                            className="h-32 w-auto object-contain"
                        />
                    </div>

                    {/* Titles */}
                    <div className="text-center mb-10">
                        <p className="text-gray-500 text-sm mb-2 font-medium tracking-wide">Start your journey</p>
                        <h1 className="text-3xl font-black text-slate-900 mb-2">
                            Connect to Predictor Access
                        </h1>
                        <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em] font-bold">
                            CONNECT TO PREDICTOR ACCESS
                        </p>
                    </div>

                    {/* Form */}
                    {isRegistering ? (
                        <form onSubmit={handleRequestAccess} className="w-full flex flex-col gap-4">
                            <input
                                type="text"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-[#FAFAFA] border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 font-bold focus:border-[#CEF002] focus:ring-1 focus:ring-[#CEF002] outline-none transition-all placeholder-gray-300"
                                placeholder="USERNAME"
                            />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-[#FAFAFA] border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 font-bold focus:border-[#CEF002] focus:ring-1 focus:ring-[#CEF002] outline-none transition-all placeholder-gray-300"
                                placeholder="EMAIL ADDRESS"
                            />

                            <button type="submit" className="w-full mt-4 bg-[#CEF002] hover:bg-[#dfff00] text-black font-black py-3 rounded-lg uppercase tracking-wider text-sm transition-all hover:scale-[1.02] active:scale-[0.98]">
                                Request Access
                            </button>

                            <div className="flex justify-between items-center mt-6 text-[11px] font-bold text-gray-400">
                                <button type="button" onClick={() => setIsRegistering(false)} className="hover:text-black transition-colors">
                                    Return to login
                                </button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleLogin} className="w-full flex flex-col gap-4">
                            {error && <div className="text-red-500 text-xs font-bold text-center mb-2">{error}</div>}

                            <input
                                type="text"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-[#FAFAFA] border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 font-bold focus:border-[#CEF002] focus:ring-1 focus:ring-[#CEF002] outline-none transition-all placeholder-gray-300 uppercase placeholder:text-[10px] placeholder:tracking-widest"
                                placeholder="USERNAME"
                            />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-[#FAFAFA] border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 font-bold focus:border-[#CEF002] focus:ring-1 focus:ring-[#CEF002] outline-none transition-all placeholder-gray-300 uppercase placeholder:text-[10px] placeholder:tracking-widest"
                                placeholder="PASSWORD"
                            />

                            <button type="submit" className="w-full mt-4 bg-[#CEF002] hover:bg-[#dfff00] text-black font-black py-3 rounded-lg uppercase tracking-wider text-sm transition-all hover:scale-[1.02] active:scale-[0.98]">
                                Log In
                            </button>

                            <div className="flex justify-between items-center mt-6 text-[11px] font-bold text-gray-400">
                                <button type="button" className="hover:text-black transition-colors">
                                    Forget username/password?
                                </button>
                                <button type="button" onClick={() => setIsRegistering(true)} className="hover:text-black transition-colors">
                                    Create account
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Bottom Link */}
                    <div className="mt-20">
                        <p className="text-gray-400 text-xs">
                            Have an account? <span className="text-[#0055A4] font-bold cursor-pointer hover:underline" onClick={() => setIsRegistering(false)}>Sign in</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* RIGHT SIDE - IMAGE */}
            <div className="hidden md:block w-[55%] relative overflow-hidden bg-slate-900">
                <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent z-10 pointer-events-none"></div>

                {/* Image found by subagent */}
                <img
                    src="https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=2070&auto=format&fit=crop"
                    alt="Stadium Atmosphere"
                    className="w-full h-full object-cover object-center scale-105 hover:scale-110 transition-transform duration-[20s] ease-in-out"
                />

                {/* Decorative Overlay Elements */}
                <div className="absolute top-8 right-8 z-20">
                    <div className="text-white font-black text-4xl tracking-tighter opacity-20">FA</div>
                </div>

                <div className="absolute bottom-8 right-8 z-20">
                    <div className="w-12 h-12 text-[#CEF002] opacity-80">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                        </svg>
                    </div>
                </div>

                <div className="absolute bottom-0 left-0 w-full p-8 z-20 bg-gradient-to-t from-black/80 to-transparent">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/10 backdrop-blur px-3 py-1 rounded text-white text-[10px] uppercase font-bold tracking-widest border border-white/20">
                            Matchday Experience
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;
