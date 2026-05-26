import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Lock, Mail, User } from 'lucide-react';
import { useUI } from '../UIContext';
import { useSite } from '../SiteContext';
import { supabase } from '../lib/supabase';

export function LoginOverlay() {
  const { isLoginOpen, setIsLoginOpen, addToast } = useUI();
  const { setCurrentUser } = useSite();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [pendingName, setPendingName] = useState('');
  const [pendingPassword, setPendingPassword] = useState('');

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

  const handleSubmit = async (e: React.FormEvent) => {
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

    if (!supabase) {
      setError('Supabase is not configured for this build.');
      addToast('Login backend is not configured', 'error');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    if (isRegister && !otpSent) {
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        addToast('Password must be at least 6 characters', 'error');
        return;
      }

      const response = await fetch('/api/signup-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          password,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = result.error || 'Could not send signup OTP.';
        setError(message);
        addToast(message, 'error');
        return;
      }

      setOtpSent(true);
      setPendingName(cleanName);
      setPendingPassword(password);
      setPassword('');
      setError('Verification OTP sent to your email. Enter it below to confirm your account.');
      addToast('Verification OTP sent to your email', 'success');
      return;
    }

    const authResult = isRegister
      ? await (async () => {
          const otpCode = password.replace(/\s/g, '');
          if (!/^\d{6}$/.test(otpCode)) {
            return { data: { session: null, user: null }, error: new Error('Enter the 6-digit OTP from your email.') };
          }

          const response = await fetch('/api/signup-verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: pendingName || cleanName,
              email: cleanEmail,
              password: pendingPassword,
              otp: otpCode,
            }),
          });

          const result = await response.json().catch(() => ({}));
          if (!response.ok) {
            return { data: { session: null, user: null }, error: new Error(result.error || 'Could not verify signup OTP.') };
          }

          return supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: pendingPassword,
          });
        })()
      : await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

    if (authResult.error) {
      setError(authResult.error.message);
      addToast(authResult.error.message, 'error');
      return;
    }

    const session = authResult.data.session;
    const user = authResult.data.user;

    if (!session || !user) {
      setError('Sign in could not be completed. Please try again.');
      addToast('Sign in could not be completed', 'error');
      return;
    }

    setCurrentUser(cleanEmail);

    if (isRegister || pendingName || user.user_metadata?.full_name) {
      const customer = {
        id: `USR-${user.id}`,
        email: cleanEmail,
        name: pendingName || user.user_metadata?.full_name || cleanEmail.split('@')[0],
        coins: 0,
        joined: new Date().toISOString().slice(0, 10),
        warnings: 0,
        status: 'Active',
      };
      const { error: customerError } = await supabase.from('customers').upsert({ id: customer.id, data: customer });
      if (customerError) {
        setError(customerError.message);
        addToast(customerError.message, 'error');
        return;
      }
    }

    addToast(
      isRegister 
        ? 'Welcome to Aabnoor! Account created successfully.' 
        : `Signed in successfully as ${cleanEmail}`, 
      'success'
    );
    setIsLoginOpen(false);
    // Reset fields
    setEmail('');
    setPassword('');
    setName('');
    setOtpSent(false);
    setPendingName('');
    setPendingPassword('');
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
                Secure Account
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
                    type={isRegister && otpSent ? 'text' : 'password'} 
                    inputMode={isRegister && otpSent ? 'numeric' : undefined}
                    autoComplete={isRegister && otpSent ? 'one-time-code' : 'current-password'}
                    value={password}
                    onChange={(e) => {
                      const nextValue = isRegister && otpSent
                        ? e.target.value.replace(/\D/g, '').slice(0, 6)
                        : e.target.value;
                      setPassword(nextValue);
                    }}
                    placeholder={isRegister && otpSent ? 'Enter Email OTP Code' : 'Password'} 
                    className="w-full bg-white border border-[#1A1A1A]/20 pl-10 pr-4 py-3 font-sans text-sm outline-none focus:border-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A] transition-all rounded-sm"
                  />
                </div>
                
                <button 
                  type="submit"
                  className="w-full bg-[#1A1A1A] text-[#F9F7F2] py-4 rounded-full font-sans text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-[#CDA185] transition-all flex items-center justify-center gap-2 cursor-pointer mt-6 shadow-md"
                >
                  {isRegister && otpSent ? 'Verify OTP' : isRegister ? 'Create Account' : 'Sign In'}
                </button>
              </form>

              <div className="mt-8 text-center pb-2">
                <button 
                  onClick={() => {
                    setIsRegister(!isRegister);
                    setOtpSent(false);
                    setPassword('');
                    setPendingName('');
                    setPendingPassword('');
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
