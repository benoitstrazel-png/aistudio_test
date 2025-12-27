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
            <div className="w-full md:w-[50%] bg-white flex flex-col items-center justify-center p-8 relative">
                <div className="w-full max-w-[400px] flex flex-col items-center">

                    {/* Logo - Vertical Ligue 1 Uber Eats style */}
                    <div className="mb-8">
                        <div className="bg-[#0B1426] p-4 pt-6 pb-6 shadow-xl">
                            <img
                                src={getLeagueLogo()}
                                alt="Ligue 1 Uber Eats"
                                className="h-24 w-auto object-contain"
                            />
                        </div>
                    </div>

                    {/* Titles */}
                    <div className="text-center mb-12">
                        <p className="text-gray-500 text-sm mb-3 font-medium tracking-wide">Start your journey</p>
                        <h1 className="text-3xl font-black text-slate-900 mb-4 px-4 leading-tight">
                            Connect to Predictor Access
                        </h1>
                        <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em] font-bold">
                            CONNECT TO PREDICTOR ACCESS
                        </p>
                    </div>

                    {/* Form */}
                    {isRegistering ? (
                        <form onSubmit={handleRequestAccess} className="w-full flex flex-col gap-5 items-center">
                            <input
                                type="text"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-white border-2 border-[#FFE500] rounded-sm px-4 py-3 text-sm text-gray-900 font-bold focus:outline-none focus:ring-2 focus:ring-[#FFE500]/50 placeholder-gray-300 uppercase tracking-wider"
                                placeholder="USERNAME"
                            />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-white border-2 border-[#FFE500] rounded-sm px-4 py-3 text-sm text-gray-900 font-bold focus:outline-none focus:ring-2 focus:ring-[#FFE500]/50 placeholder-gray-300 uppercase tracking-wider"
                                placeholder="EMAIL ADDRESS"
                            />

                            <button type="submit" className="w-[180px] mt-4 bg-[#FFE500] hover:bg-[#E6CE00] text-black font-black py-3 rounded-md uppercase tracking-wider text-sm transition-all shadow-md">
                                Request Access
                            </button>

                            <div className="w-full flex justify-center mt-6">
                                <button type="button" onClick={() => setIsRegistering(false)} className="text-[11px] text-gray-500 hover:text-black hover:underline transition-colors font-medium">
                                    Return to login
                                </button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleLogin} className="w-full flex flex-col gap-5 items-center">
                            {error && <div className="text-red-500 text-xs font-bold text-center mb-2 w-full">{error}</div>}

                            <input
                                type="text"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-white border-2 border-[#FFE500] rounded-sm px-4 py-3 text-sm text-gray-900 font-bold focus:outline-none focus:ring-2 focus:ring-[#FFE500]/50 placeholder-gray-300 uppercase tracking-wider"
                                placeholder="USERNAME"
                            />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-white border-2 border-[#FFE500] rounded-sm px-4 py-3 text-sm text-gray-900 font-bold focus:outline-none focus:ring-2 focus:ring-[#FFE500]/50 placeholder-gray-300 uppercase tracking-wider"
                                placeholder="PASSWORD"
                            />

                            <button type="submit" className="w-[180px] mt-4 bg-[#FFE500] hover:bg-[#E6CE00] text-black font-black py-3 rounded-md uppercase tracking-wider text-sm transition-all shadow-md">
                                LOG IN
                            </button>

                            <div className="w-full flex justify-between items-center mt-8 px-2">
                                <button type="button" className="text-[11px] text-gray-500 hover:text-black transition-colors font-medium">
                                    Forget username/password?
                                </button>
                                <button type="button" onClick={() => setIsRegistering(true)} className="text-[11px] text-gray-500 hover:text-black transition-colors font-medium">
                                    Create account
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Bottom Link */}
                    <div className="absolute bottom-6 left-8">
                        <p className="text-gray-400 text-xs font-medium">
                            Have an account? <span className="text-[#0055A4] font-bold cursor-pointer hover:underline" onClick={() => setIsRegistering(false)}>Sign in</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* RIGHT SIDE - IMAGE */}
            <div className="hidden md:block w-[50%] relative overflow-hidden bg-slate-900">
                {/* Image of PSG vs OM Match Action to match reference */}
                <img
                    src="https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=2070&auto=format&fit=crop"
                    alt="Ligue 1 Match"
                    className="w-full h-full object-cover object-center"
                />

                {/* Decorative Overlay Elements */}
                <div className="absolute top-0 right-0 p-8 w-full flex justify-end bg-gradient-to-b from-black/50 to-transparent">
                    <span className="text-white font-black italic tracking-tighter text-3xl drop-shadow-lg">LIGUE 1 <span className="text-[#FFE500]">Uber Eats</span></span>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;
