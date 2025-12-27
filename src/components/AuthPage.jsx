import React, { useState } from 'react';
import { getLeagueLogo } from '../utils/logos';
import { motion, AnimatePresence } from 'framer-motion';

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
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="w-full md:w-[50%] bg-white flex flex-col items-center justify-center p-8 relative z-10"
            >
                <div className="w-full max-w-[400px] flex flex-col items-center">

                    {/* Logo - Vertical Ligue 1 Uber Eats style */}
                    <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.6 }}
                        className="mb-10"
                    >
                        <div className="bg-[#0B1426] p-5 pt-7 pb-7 shadow-2xl transform hover:scale-105 transition-transform duration-500 cursor-pointer">
                            <img
                                src={getLeagueLogo()}
                                alt="Ligue 1 Uber Eats"
                                className="h-28 w-auto object-contain drop-shadow-md"
                            />
                        </div>
                    </motion.div>

                    {/* Titles */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4, duration: 0.6 }}
                        className="text-center mb-12"
                    >
                        <p className="text-gray-500 text-sm mb-3 font-medium tracking-wide font-['Barlow']">Start your journey</p>
                        <h1 className="text-4xl font-black text-slate-900 mb-4 px-4 leading-none tracking-tight font-['Barlow_Condensed'] uppercase">
                            Connect to <br />Predictor Access
                        </h1>
                        <p className="text-[10px] text-gray-400 uppercase tracking-[0.25em] font-bold font-['Barlow']">
                            Official Data Platform
                        </p>
                    </motion.div>

                    {/* Form */}
                    <AnimatePresence mode="wait">
                        {isRegistering ? (
                            <motion.form
                                key="register"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                                onSubmit={handleRequestAccess}
                                className="w-full flex flex-col gap-5 items-center"
                            >
                                <div className="w-full space-y-5">
                                    <motion.input
                                        whileFocus={{ scale: 1.02, borderColor: '#CEF002' }}
                                        type="text"
                                        required
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="w-full bg-white border-2 border-[#FFE500] rounded-none px-4 py-4 text-sm text-gray-900 font-bold focus:outline-none focus:ring-4 focus:ring-[#FFE500]/20 placeholder-gray-300 uppercase tracking-wider font-['Barlow'] transition-all"
                                        placeholder="Username"
                                    />
                                    <motion.input
                                        whileFocus={{ scale: 1.02, borderColor: '#CEF002' }}
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-white border-2 border-[#FFE500] rounded-none px-4 py-4 text-sm text-gray-900 font-bold focus:outline-none focus:ring-4 focus:ring-[#FFE500]/20 placeholder-gray-300 uppercase tracking-wider font-['Barlow'] transition-all"
                                        placeholder="Email Address"
                                    />
                                </div>

                                <motion.button
                                    whileHover={{ scale: 1.05, backgroundColor: '#E6CE00' }}
                                    whileTap={{ scale: 0.95 }}
                                    type="submit"
                                    className="w-[200px] mt-6 bg-[#FFE500] text-black font-black py-4 rounded-sm uppercase tracking-widest text-sm shadow-[0_4px_10px_rgba(255,229,0,0.3)] font-['Barlow_Condensed']"
                                >
                                    Request Access
                                </motion.button>

                                <div className="w-full flex justify-center mt-6">
                                    <button type="button" onClick={() => setIsRegistering(false)} className="text-xs text-gray-500 hover:text-black hover:underline transition-colors font-bold uppercase tracking-wide">
                                        Return to login
                                    </button>
                                </div>
                            </motion.form>
                        ) : (
                            <motion.form
                                key="login"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.3 }}
                                onSubmit={handleLogin}
                                className="w-full flex flex-col gap-5 items-center"
                            >
                                {error && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        className="text-red-500 text-xs font-bold text-center mb-2 w-full bg-red-50 p-2 rounded border border-red-100"
                                    >
                                        {error}
                                    </motion.div>
                                )}

                                <div className="w-full space-y-5">
                                    <motion.input
                                        whileFocus={{ scale: 1.02, borderColor: '#CEF002' }}
                                        type="text"
                                        required
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="w-full bg-white border-2 border-[#FFE500] rounded-none px-4 py-4 text-sm text-gray-900 font-bold focus:outline-none focus:ring-4 focus:ring-[#FFE500]/20 placeholder-gray-300 uppercase tracking-wider font-['Barlow'] transition-all"
                                        placeholder="Username"
                                    />
                                    <motion.input
                                        whileFocus={{ scale: 1.02, borderColor: '#CEF002' }}
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-white border-2 border-[#FFE500] rounded-none px-4 py-4 text-sm text-gray-900 font-bold focus:outline-none focus:ring-4 focus:ring-[#FFE500]/20 placeholder-gray-300 uppercase tracking-wider font-['Barlow'] transition-all"
                                        placeholder="Password"
                                    />
                                </div>

                                <motion.button
                                    whileHover={{ scale: 1.05, backgroundColor: '#E6CE00' }}
                                    whileTap={{ scale: 0.95 }}
                                    type="submit"
                                    className="w-[200px] mt-6 bg-[#FFE500] text-black font-black py-4 rounded-sm uppercase tracking-widest text-sm shadow-[0_4px_10px_rgba(255,229,0,0.3)] font-['Barlow_Condensed']"
                                >
                                    Log In
                                </motion.button>

                                <div className="w-full flex justify-between items-center mt-8 px-2">
                                    <button type="button" className="text-[10px] text-gray-400 hover:text-black transition-colors font-bold uppercase tracking-wider">
                                        Forgot Password?
                                    </button>
                                    <button type="button" onClick={() => setIsRegistering(true)} className="text-[10px] text-gray-400 hover:text-black transition-colors font-bold uppercase tracking-wider">
                                        Create account
                                    </button>
                                </div>
                            </motion.form>
                        )}
                    </AnimatePresence>

                    {/* Bottom Link */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                        className="absolute bottom-6 left-8"
                    >
                        <p className="text-gray-400 text-xs font-medium font-['Barlow']">
                            Secured by <span className="text-[#0B1426] font-bold">Ligue 1 Tech</span>
                        </p>
                    </motion.div>
                </div>
            </motion.div>

            {/* RIGHT SIDE - IMAGE */}
            <motion.div
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="hidden md:block w-[50%] relative overflow-hidden bg-slate-900"
            >
                {/* Image of PSG vs OM Match Action to match reference */}
                <div className="absolute inset-0 bg-black/10 z-10"></div>
                <img
                    src="https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=2070&auto=format&fit=crop"
                    alt="Ligue 1 Match"
                    className="w-full h-full object-cover object-center"
                />

                {/* Decorative Overlay Elements */}
                <motion.div
                    initial={{ x: 100, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.8 }}
                    className="absolute top-0 right-0 p-10 w-full flex justify-end bg-gradient-to-b from-black/60 to-transparent z-20"
                >
                    <span className="text-white font-black italic tracking-tighter text-4xl drop-shadow-xl font-['Barlow_Condensed']">LIGUE 1 <span className="text-[#FFE500]">Uber Eats</span></span>
                </motion.div>

                {/* Animated Particles/Overlay for depth */}
                <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[#0B1426]/90 to-transparent z-20"></div>
            </motion.div>
        </div>
    );
};

export default AuthPage;
