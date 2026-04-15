import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../lib/store';
import { supabase } from '../lib/supabase';

// Schemas
const signUpSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  isManager: z.boolean().optional(),
});

const signInSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(1, 'Password is required'),
});

type SignUpData = z.infer<typeof signUpSchema>;
type SignInData = z.infer<typeof signInSchema>;

export function AuthModal() {
  const { isAuthModalOpen, authModalTab, setAuthModalOpen, setUser } = useAppStore();
  const [tab, setTab] = useState<'signin' | 'signup'>(authModalTab);
  const [showPassword, setShowPassword] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const navigate = useNavigate();

  const signUpForm = useForm<SignUpData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { isManager: true },
  });

  const signInForm = useForm<SignInData>({
    resolver: zodResolver(signInSchema),
  });

  const onSignUp = async (data: SignUpData) => {
    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: { full_name: data.fullName, is_manager: data.isManager },
        },
      });
      if (error) throw error;
      if (!authData.user) return;

      // If session exists, email confirmation is disabled — log them in immediately
      if (authData.session) {
        setUser({
          id: authData.user.id,
          email: authData.user.email!,
          user_metadata: authData.user.user_metadata,
        });
        setAuthModalOpen(false);
        toast.success('Account created! Welcome to DevROI.');
        navigate('/setup');
      } else {
        // Email confirmation is enabled — show "check your email" state
        setEmailSent(true);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign up failed';
      toast.error(msg);
    }
  };

  const onSignIn = async (data: SignInData) => {
    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (error) throw error;
      if (authData.user) {
        setUser({
          id: authData.user.id,
          email: authData.user.email!,
          user_metadata: authData.user.user_metadata,
        });
        setAuthModalOpen(false);
        toast.success('Welcome back!');

        // Check for existing workspace
        const { data: ws } = await supabase
          .from('workspaces')
          .select('id')
          .eq('user_id', authData.user.id)
          .single();

        navigate(ws ? '/dashboard' : '/setup');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign in failed';
      toast.error(msg);
    }
  };

  const onForgotPassword = async () => {
    const email = signInForm.getValues('email');
    if (!email) {
      toast.error('Enter your email address first');
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      toast.success('Password reset email sent!');
      setForgotPassword(false);
    } catch {
      toast.error('Failed to send reset email');
    }
  };

  const handleClose = () => {
    setAuthModalOpen(false);
    setEmailSent(false);
    setForgotPassword(false);
  };

  return (
    <AnimatePresence>
      {isAuthModalOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed inset-x-4 bottom-0 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:top-1/2 md:-translate-y-1/2 md:w-full md:max-w-[420px] z-50"
          >
            <div className="glass border border-white/10 rounded-t-2xl md:rounded-2xl p-6 shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-heading text-xl font-bold text-white">
                    {tab === 'signin' ? 'Welcome back' : 'Create account'}
                  </h2>
                  <p className="text-sm text-white/40 mt-0.5">
                    {tab === 'signin'
                      ? 'Sign in to access your workspace'
                      : 'Start measuring your AI ROI'}
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 bg-obsidian rounded-lg p-1 mb-6 relative">
                <motion.div
                  className="absolute inset-y-1 rounded-md bg-card-dark border border-white/10"
                  animate={{ left: tab === 'signin' ? 4 : '50%', right: tab === 'signin' ? '50%' : 4 }}
                  transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                />
                <button
                  onClick={() => setTab('signin')}
                  className={`relative z-10 flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                    tab === 'signin' ? 'text-white' : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  Sign in
                </button>
                <button
                  onClick={() => setTab('signup')}
                  className={`relative z-10 flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                    tab === 'signup' ? 'text-white' : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  Sign up
                </button>
              </div>

              {/* Sign Up Form */}
              {tab === 'signup' && (
                emailSent ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-6"
                  >
                    <CheckCircle2 className="w-12 h-12 text-positive mx-auto mb-3" />
                    <p className="font-semibold text-white">Check your email!</p>
                    <p className="text-sm text-white/50 mt-1">
                      We've sent a confirmation link to your email address.
                    </p>
                  </motion.div>
                ) : (
                  <form onSubmit={signUpForm.handleSubmit(onSignUp)} className="space-y-4">
                    <div>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                        <input
                          {...signUpForm.register('fullName')}
                          type="text"
                          placeholder="Full name"
                          className="input-dark pl-10"
                        />
                      </div>
                      {signUpForm.formState.errors.fullName && (
                        <p className="text-negative text-xs mt-1">
                          {signUpForm.formState.errors.fullName.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                        <input
                          {...signUpForm.register('email')}
                          type="email"
                          placeholder="Work email"
                          className="input-dark pl-10"
                        />
                      </div>
                      {signUpForm.formState.errors.email && (
                        <p className="text-negative text-xs mt-1">
                          {signUpForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                        <input
                          {...signUpForm.register('password')}
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Password (min. 8 chars)"
                          className="input-dark pl-10 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {signUpForm.formState.errors.password && (
                        <p className="text-negative text-xs mt-1">
                          {signUpForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        {...signUpForm.register('isManager')}
                        type="checkbox"
                        defaultChecked
                        className="w-4 h-4 rounded border-white/20 bg-obsidian accent-accent"
                      />
                      <span className="text-sm text-white/60">I manage an engineering team</span>
                    </label>

                    <button
                      type="submit"
                      disabled={signUpForm.formState.isSubmitting}
                      className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                      {signUpForm.formState.isSubmitting && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                      Create account
                    </button>
                  </form>
                )
              )}

              {/* Sign In Form */}
              {tab === 'signin' && (
                <form onSubmit={signInForm.handleSubmit(onSignIn)} className="space-y-4">
                  <div>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <input
                        {...signInForm.register('email')}
                        type="email"
                        placeholder="Email address"
                        className="input-dark pl-10"
                      />
                    </div>
                    {signInForm.formState.errors.email && (
                      <p className="text-negative text-xs mt-1">
                        {signInForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <input
                        {...signInForm.register('password')}
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Password"
                        className="input-dark pl-10 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {signInForm.formState.errors.password && (
                      <p className="text-negative text-xs mt-1">
                        {signInForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={onForgotPassword}
                    className="text-xs text-accent/60 hover:text-accent transition-colors -mt-2"
                  >
                    Forgot password?
                  </button>

                  <button
                    type="submit"
                    disabled={signInForm.formState.isSubmitting}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    {signInForm.formState.isSubmitting && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    Sign in
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
