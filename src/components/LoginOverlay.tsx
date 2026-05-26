import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Lock, Mail, User } from 'lucide-react';
import { useUI } from '../UIContext';
import { useSite } from '../SiteContext';
import { supabase } from '../lib/supabase';

function GoogleIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}

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

  const handleGoogleLogin = async () => {
    setError('');

    if (!supabase) {
      setError('Supabase is not configured for this build.');
      addToast('Login backend is not configured', 'error');
      return;
    }

    const { error: googleError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (googleError) {
      setError(googleError.message);
      addToast(googleError.message, 'error');
    }
  };

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

              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full bg-white border border-[#1A1A1A]/15 text-[#1A1A1A] py-3 rounded-full font-sans text-[11px] font-bold uppercase tracking-[0.16em] hover:border-[#1A1A1A] hover:bg-[#1A1A1A]/5 transition-all flex items-center justify-center gap-2 cursor-pointer mb-4 shadow-sm"
              >
                <GoogleIcon />
                Continue with Google
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-[#1A1A1A]/10" />
                <span className="font-sans text-[9px] uppercase tracking-[0.2em] text-[#1A1A1A]/35 font-bold">or</span>
                <div className="h-px flex-1 bg-[#1A1A1A]/10" />
              </div>

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
