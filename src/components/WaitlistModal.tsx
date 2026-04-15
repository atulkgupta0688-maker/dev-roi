import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, CheckCircle2, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useAppStore } from '../lib/store';
import { supabase } from '../lib/supabase';

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type FormData = z.infer<typeof schema>;

export function WaitlistModal() {
  const { isWaitlistModalOpen, setWaitlistModalOpen } = useAppStore();
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      // Try Supabase first, fall back to localStorage
      try {
        const { error } = await supabase.from('waitlist').insert({ email: data.email });
        if (error && error.code !== '23505') throw error; // ignore duplicate
      } catch {
        // Fallback: store in localStorage
        const existing = JSON.parse(localStorage.getItem('devroi_waitlist') ?? '[]') as string[];
        if (!existing.includes(data.email)) {
          existing.push(data.email);
          localStorage.setItem('devroi_waitlist', JSON.stringify(existing));
        }
      }
      setSuccess(true);
    } catch {
      toast.error('Something went wrong. Please try again.');
    }
  };

  const handleClose = () => {
    setWaitlistModalOpen(false);
    setSuccess(false);
    reset();
  };

  return (
    <AnimatePresence>
      {isWaitlistModalOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-4 bottom-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-md z-50 glass border border-white/10 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-heading text-xl font-bold text-white">
                  Join the waitlist
                </h2>
                <p className="text-sm text-white/50 mt-1">
                  Be first when we launch Jira + GitHub integration.
                </p>
              </div>
              <button
                onClick={handleClose}
                className="p-2 rounded-lg hover:bg-white/5 text-white/50 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {success ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6"
              >
                <CheckCircle2 className="w-12 h-12 text-positive mx-auto mb-3" />
                <p className="font-semibold text-white">You're on the list!</p>
                <p className="text-sm text-white/50 mt-1">We'll be in touch soon.</p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      {...register('email')}
                      type="email"
                      placeholder="your@company.com"
                      className="input-dark pl-10"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-negative text-xs mt-1">{errors.email.message}</p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : null}
                  Join waitlist
                </button>
              </form>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
