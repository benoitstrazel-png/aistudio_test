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
        <div className="min-h-screen flex flex-col md:flex-row font-sans overflow-hidden bg-white">
            {/* LEFT SIDE - FORM */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="w-full md:w-[50%] bg-white flex flex-col items-center justify-center p-8 relative z-10"
            >
                <div className="w-full max-w-[420px] flex flex-col items-center">

                    {/* Logo Area */}
                    <div className="mb-16">
                        <img
                            src={getLeagueLogo()}
                            alt="Ligue 1 Uber Eats"
                            className="h-32 w-auto object-contain"
                        />
                    </div>

                    {/* Titles */}
                    <div className="w-full text-center mb-10">
                        <p className="text-gray-500 text-sm mb-2 font-medium font-['Barlow']">Start your journey</p>
                        <h1 className="text-3xl font-bold text-[#0B1426] mb-3 font-['Barlow']">
                            Connect to Predictor Access
                        </h1>
                        <p className="text-[10px] text-gray-400 uppercase tracking-[0.1em] font-medium font-['Barlow']">
                            CONNECT TO PREDICTOR ACCESS
                        </p>
                    </div>

                    {/* Form */}
                    <AnimatePresence mode="wait">
                        {isRegistering ? (
                            <motion.form
                                key="register"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                onSubmit={handleRequestAccess}
                                className="w-full flex flex-col gap-4"
                            >
                                <input
                                    type="text"
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full h-12 border border-[#FFE500] rounded-[2px] px-4 text-sm text-gray-700 placeholder-gray-300 font-medium uppercase focus:outline-none focus:border-[#FFE500] focus:ring-1 focus:ring-[#FFE500]"
                                    placeholder="USERNAME"
                                />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full h-12 border border-[#FFE500] rounded-[2px] px-4 text-sm text-gray-700 placeholder-gray-300 font-medium uppercase focus:outline-none focus:border-[#FFE500] focus:ring-1 focus:ring-[#FFE500]"
                                    placeholder="EMAIL ADDRESS"
                                />

                                <div className="flex justify-center mt-4">
                                    <button
                                        type="submit"
                                        className="bg-[#FFE500] text-[#0B1426] font-bold py-3 px-12 rounded-[2px] text-sm uppercase tracking-wide hover:brightness-105 transition-all"
                                    >
                                        REQUEST ACCESS
                                    </button>
                                </div>

                                <div className="w-full flex justify-center mt-6">
                                    <button type="button" onClick={() => setIsRegistering(false)} className="text-xs text-gray-500 hover:text-[#0B1426] transition-colors">
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
                                transition={{ duration: 0.3 }}
                                onSubmit={handleLogin}
                                className="w-full flex flex-col gap-4"
                            >
                                {error && (
                                    <div className="text-red-500 text-xs text-center mb-2">{error}</div>
                                )}

                                <input
                                    type="text"
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full h-12 border border-[#FFE500] rounded-[2px] px-4 text-sm text-gray-700 placeholder-gray-300 font-medium uppercase focus:outline-none focus:border-[#FFE500] focus:ring-1 focus:ring-[#FFE500]"
                                    placeholder="UEEFINAME"
                                />

                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full h-12 border border-[#FFE500] rounded-[2px] px-4 text-sm text-gray-700 placeholder-gray-300 font-medium uppercase focus:outline-none focus:border-[#FFE500] focus:ring-1 focus:ring-[#FFE500]"
                                    placeholder="PASSWORD"
                                />

                                <div className="flex justify-center mt-4">
                                    <button
                                        type="submit"
                                        className="bg-[#FFE500] text-[#0B1426] font-bold py-3 px-16 rounded-[4px] text-sm uppercase tracking-wide hover:brightness-105 transition-all"
                                    >
                                        LOG IN
                                    </button>
                                </div>

                                <div className="w-full flex justify-between items-center mt-6 px-1">
                                    <button type="button" className="text-xs text-gray-500 hover:text-[#0B1426] transition-colors">
                                        Forget username/password?
                                    </button>
                                    <button type="button" onClick={() => setIsRegistering(true)} className="text-xs text-gray-500 hover:text-[#0B1426] transition-colors">
                                        Create account
                                    </button>
                                </div>
                            </motion.form>
                        )}
                    </AnimatePresence>
                </div>

                {/* Bottom Left Link */}
                <div className="absolute bottom-6 left-8">
                    <p className="text-gray-500 text-xs">
                        Have an account? <span className="text-[#0055A4] font-medium cursor-pointer hover:underline" onClick={() => setIsRegistering(false)}>Sign in</span>
                    </p>
                </div>
            </motion.div>

            {/* RIGHT SIDE - IMAGE */}
            <div className="hidden md:block w-[50%] h-screen relative bg-[#0B1426]">
                <img
                    src={loginBg}
                    alt="Ligue 1 Stadium"
                    className="w-full h-full object-cover object-center"
                />
            </div>
        </div>
    );
};

export default AuthPage;
