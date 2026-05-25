import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Lock, Mail, User } from 'lucide-react';
import { useUI } from '../UIContext';
import { useSite } from '../SiteContext';

export function LoginOverlay() {
  const { isLoginOpen, setIsLoginOpen, addToast } = useUI();
  const { setCurrentUser } = useSite();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  // Scroll lock when modal is open
  useEffect(() => {
    if (isLoginOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isLoginOpen]);

  // Support Escape key to exit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsLoginOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsLoginOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isRegister && !name.trim()) {
      setError('Full name is required.');
      addToast('Name is required', 'error');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      addToast('Invalid email address', 'error');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      addToast('Password must be at least 6 characters', 'error');
      return;
    }

    // Success login
    setCurrentUser(email.trim());
    addToast(
      isRegister 
        ? 'Welcome to Aabnoor! Account created successfully.' 
        : `Signed in successfully as ${email.trim()}`, 
      'success'
    );
    setIsLoginOpen(false);
    // Reset fields
    setEmail('');
    setPassword('');
    setName('');
    setError('');
  };

  return (
    <AnimatePresence>
      {isLoginOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsLoginOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm cursor-pointer"
          />
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.98 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed inset-x-4 top-[10%] md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 w-full max-w-md bg-[#F9F7F2] rounded-2xl z-50 p-6 md:p-8 flex flex-col shadow-2xl border border-[#1A1A1A]/10 font-sans"
          >
            <div className="flex justify-between items-center pb-4 border-b border-[#1A1A1A]/5 mb-6">
              <span className="font-sans text-[10px] uppercase font-bold tracking-[0.2em] text-[#CDA185] bg-[#CDA185]/10 px-3 py-1 rounded-full">
                Demo Environment
              </span>
              <button 
                onClick={() => setIsLoginOpen(false)} 
                className="p-2 hover:bg-[#1A1A1A]/5 rounded-full transition-colors cursor-pointer"
                aria-label="Close credentials"
              >
                <X className="w-5 h-5 text-[#1A1A1A]" />
              </button>
            </div>
            
            <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
              <h2 className="font-serif italic font-light text-4xl text-[#1A1A1A] mb-2 text-center">
                {isRegister ? 'Join Aabnoor' : 'Welcome Back'}
              </h2>
              <p className="font-sans text-[10px] uppercase tracking-widest text-[#1A1A1A]/50 text-center mb-6 font-bold">
                {isRegister ? 'Create your luxury profiling' : 'Sign in to access loyalty rewards'}
              </p>

              {/* Demo Mode Box Notification */}
              <div className="bg-[#1A1A1A]/5 border border-[#1A1A1A]/10 p-3 rounded-md mb-6 text-center text-[10px] font-sans text-[#1A1A1A]/70 leading-relaxed font-semibold">
                ✨ <strong>Aabnoor Demo Sandbox:</strong> Enter any email and password above 6 characters to simulate secure customer loyalty.
              </div>

              {error && (
                <div className="text-red-600 bg-red-50 border border-red-200 p-3 rounded-sm text-xs font-bold font-sans mb-4">
                  {error}
                </div>
              )}

              <form className="space-y-4" onSubmit={handleSubmit}>
                {isRegister && (
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1A1A1A]/40" />
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Full Name" 
                      className="w-full bg-white border border-[#1A1A1A]/20 pl-10 pr-4 py-3 font-sans text-sm outline-none focus:border-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A] transition-all rounded-sm"
                    />
                  </div>
                )}
                
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1A1A1A]/40" />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email Address" 
                    className="w-full bg-white border border-[#1A1A1A]/20 pl-10 pr-4 py-3 font-sans text-sm outline-none focus:border-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A] transition-all rounded-sm"
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1A1A1A]/40" />
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password" 
                    className="w-full bg-white border border-[#1A1A1A]/20 pl-10 pr-4 py-3 font-sans text-sm outline-none focus:border-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A] transition-all rounded-sm"
                  />
                </div>
                
                <button 
                  type="submit"
                  className="w-full bg-[#1A1A1A] text-[#F9F7F2] py-4 rounded-full font-sans text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-[#CDA185] transition-all flex items-center justify-center gap-2 cursor-pointer mt-6 shadow-md"
                >
                  {isRegister ? 'Create Account' : 'Sign In'}
                </button>
              </form>

              <div className="mt-8 text-center pb-2">
                <button 
                  onClick={() => {
                    setIsRegister(!isRegister);
                    setError('');
                  }}
                  className="font-sans text-[11px] uppercase tracking-widest font-bold text-[#1A1A1A]/70 hover:text-[#CDA185] transition-colors border-b border-[#1A1A1A]/20 hover:border-[#CDA185]/50 pb-1 cursor-pointer"
                >
                  {isRegister ? 'Already registered? Sign In' : 'Need an profile? Sign Up'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
