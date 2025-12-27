import React, { useState } from 'react';
import { getLeagueLogo } from '../utils/logos';
import { motion, AnimatePresence } from 'framer-motion';
import loginBg from '../assets/login-bg.png';

const AuthPage = ({ onLogin }) => {
    const [isRegistering, setIsRegistering] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');

    const handleLogin = (e) => {
        e.preventDefault();
        // Simulation of secure credentials
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
        <div className="min-h-screen flex flex-col lg:flex-row font-sans bg-white overflow-hidden">
            {/* 1. Layout: 50% left, 50% right */}
            {/* Switch to lg:flex-row and lg:w-[50%] for Tablet Optimization */}

            {/* 2. Left Panel (Login Interface) */}
            <div className="w-full lg:w-[50%] bg-white flex flex-col items-center justify-center p-10 relative">
                <div className="w-full max-w-[420px] flex flex-col items-center relative z-10">

                    {/* Header: Center 'Ligue 1 Uber Eats' logo */}
                    <div className="mb-12">
                        <img
                            src={getLeagueLogo()}
                            alt="Ligue 1 Uber Eats"
                            className="h-32 w-auto object-contain"
                        />
                    </div>

                    {/* Typography */}
                    <div className="w-full text-center mb-10">
                        {/* Subtitle */}
                        <p className="text-gray-500 text-sm mb-2 font-normal font-['Barlow']">Start your journey</p>
                        {/* Large, bold H1 */}
                        <h1 className="text-3xl font-bold text-[#0B1426] font-['Barlow']">
                            Connect to Predictor Access
                        </h1>
                    </div>

                    {/* Form */}
                    <AnimatePresence mode="wait">
                        {isRegistering ? (
                            <motion.form
                                key="register"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onSubmit={handleRequestAccess}
                                className="w-full flex flex-col gap-5"
                            >
                                <input
                                    type="text"
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full h-12 bg-white border border-[#FFE500] rounded-none px-4 text-sm text-gray-900 placeholder-gray-300 font-medium uppercase focus:outline-none focus:ring-1 focus:ring-[#FFE500]"
                                    placeholder="USERNAME"
                                />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full h-12 bg-white border border-[#FFE500] rounded-none px-4 text-sm text-gray-900 placeholder-gray-300 font-medium uppercase focus:outline-none focus:ring-1 focus:ring-[#FFE500]"
                                    placeholder="EMAIL ADDRESS"
                                />

                                <div className="flex justify-center mt-2">
                                    <button
                                        type="submit"
                                        className="bg-[#FFE500] text-black font-bold py-3 px-10 rounded-sm text-sm uppercase tracking-wide hover:brightness-105 transition-all"
                                    >
                                        REQUEST ACCESS
                                    </button>
                                </div>
                                <div className="w-full flex justify-center mt-6">
                                    <button type="button" onClick={() => setIsRegistering(false)} className="text-xs text-gray-500 hover:text-black">
                                        Return to login
                                    </button>
                                </div>
                            </motion.form>
                        ) : (
                            <motion.form
                                key="login"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onSubmit={handleLogin}
                                className="w-full flex flex-col gap-5"
                            >
                                {error && <div className="text-red-500 text-xs text-center">{error}</div>}

                                {/* Input: Username */}
                                <input
                                    type="text"
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full h-12 bg-white border border-[#FFE500] rounded-none px-4 text-sm text-gray-900 placeholder-gray-300 font-medium uppercase focus:outline-none focus:ring-1 focus:ring-[#FFE500]"
                                    placeholder="USERNAME"
                                />

                                {/* Input: Password */}
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full h-12 bg-white border border-[#FFE500] rounded-none px-4 text-sm text-gray-900 placeholder-gray-300 font-medium uppercase focus:outline-none focus:ring-1 focus:ring-[#FFE500]"
                                    placeholder="PASSWORD"
                                />

                                {/* Button: LOG IN */}
                                <div className="flex justify-center mt-2">
                                    <button
                                        type="submit"
                                        className="bg-[#FFE500] text-black font-bold py-3 px-16 rounded-sm text-sm uppercase tracking-wide hover:brightness-105 transition-all"
                                    >
                                        LOG IN
                                    </button>
                                </div>

                                {/* Footer Links */}
                                <div className="w-full flex justify-between items-center mt-8 px-1">
                                    <button type="button" className="text-xs text-gray-500 hover:text-black transition-colors">
                                        Forgot username/password?
                                    </button>
                                    <button type="button" onClick={() => setIsRegistering(true)} className="text-xs text-gray-500 hover:text-black transition-colors">
                                        Create account
                                    </button>
                                </div>
                            </motion.form>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer: 'Have an account? Sign in' at the very bottom left */}
                <div className="absolute bottom-8 left-10">
                    <p className="text-gray-500 text-xs">
                        Have an account? <span className="text-[#0055A4] font-medium cursor-pointer hover:underline" onClick={() => setIsRegistering(false)}>Sign in</span>
                    </p>
                </div>
            </div>

            {/* 3. Right Panel (Image) */}
            {/* Hidden on Mobile and Tablet (< 1024px), Visible on Desktop */}
            <div className="hidden lg:block w-[50%] h-screen relative bg-gray-100">
                <img
                    src={loginBg}
                    alt="Ligue 1 Stadium"
                    className="w-full h-full object-cover"
                />
            </div>
        </div>
    );
};

export default AuthPage;
