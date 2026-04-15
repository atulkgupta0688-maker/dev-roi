import { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Trash2, AlertTriangle, Save, Loader2 } from 'lucide-react';
import { PageTransition } from '../components/PageTransition';
import { useAppStore } from '../lib/store';
import { saveWorkspace } from '../lib/hooks/useWorkspace';
import { supabase } from '../lib/supabase';

const workspaceSchema = z.object({
  name: z.string().min(1, 'Required'),
  team_size: z.number().min(1).max(100),
  avg_annual_salary: z.number().min(1000),
  monthly_hours: z.number().min(1).max(300),
});

type WorkspaceFormData = z.infer<typeof workspaceSchema>;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-6 mb-6">
      <h3 className="font-semibold text-white mb-5 pb-3 border-b border-white/[0.06]">{title}</h3>
      {children}
    </div>
  );
}

export function Settings() {
  const { workspace, user, isDemoMode, setWorkspace, clearData } = useAppStore();
  const [resetConfirm, setResetConfirm] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<WorkspaceFormData>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: workspace
      ? {
          name: workspace.name,
          team_size: workspace.team_size,
          avg_annual_salary: workspace.avg_annual_salary,
          monthly_hours: workspace.monthly_hours,
        }
      : {},
  });

  const onSave = async (data: WorkspaceFormData) => {
    if (!workspace) return;
    try {
      if (!isDemoMode && user) {
        const updated = await saveWorkspace(user.id, { ...workspace, ...data });
        if (updated) setWorkspace(updated);
      } else {
        setWorkspace({ ...workspace, ...data });
      }
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save settings');
    }
  };

  const handleReset = async () => {
    if (!resetConfirm) {
      setResetConfirm(true);
      return;
    }
    try {
      if (!isDemoMode && user) {
        // Delete workspace from Supabase (cascades to platforms and developers)
        await supabase.from('workspaces').delete().eq('user_id', user.id);
      }
      clearData();
      navigate('/setup');
      toast.success('Workspace reset');
    } catch {
      toast.error('Failed to reset workspace');
    }
  };

  return (
    <PageTransition>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-white/40 mt-1">Manage your workspace configuration</p>
      </div>

      {/* Workspace settings */}
      <Section title="Workspace">
        <form onSubmit={handleSubmit(onSave)} className="space-y-5 max-w-lg">
          <div>
            <label className="text-sm text-white/60 mb-1.5 block">Workspace name</label>
            <input {...register('name')} className="input-dark" />
            {errors.name && <p className="text-negative text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="text-sm text-white/60 mb-1.5 block flex justify-between">
              <span>Team size</span>
            </label>
            <input {...register('team_size', { valueAsNumber: true })} className="input-dark" type="number" min="1" max="100" />
            {errors.team_size && <p className="text-negative text-xs mt-1">{errors.team_size.message}</p>}
          </div>
          <div>
            <label className="text-sm text-white/60 mb-1.5 block">Average annual salary ($)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30">$</span>
              <input {...register('avg_annual_salary', { valueAsNumber: true })} className="input-dark pl-8" type="number" />
            </div>
            {errors.avg_annual_salary && <p className="text-negative text-xs mt-1">{errors.avg_annual_salary.message}</p>}
          </div>
          <div>
            <label className="text-sm text-white/60 mb-1.5 block">Monthly working hours per dev</label>
            <input {...register('monthly_hours', { valueAsNumber: true })} className="input-dark" type="number" />
          </div>
          <button type="submit" disabled={isSubmitting} className="btn-primary flex items-center gap-2">
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save changes
          </button>
        </form>
      </Section>

      {/* Account info */}
      {user && !isDemoMode && (
        <Section title="Account">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-white/[0.04]">
              <span className="text-white/40">Email</span>
              <span className="text-white/80 font-mono">{user.email}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/[0.04]">
              <span className="text-white/40">Name</span>
              <span className="text-white/80">{user.user_metadata?.full_name ?? '—'}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-white/40">Account type</span>
              <span className="badge-cyan">Engineering Manager</span>
            </div>
          </div>
        </Section>
      )}

      {/* Danger zone */}
      <div className="card p-6 border-negative/20">
        <h3 className="font-semibold text-negative mb-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Danger Zone
        </h3>
        <p className="text-sm text-white/40 mb-4">
          Resetting your workspace will permanently delete all your data — workspace config, platforms, and developer entries.
        </p>
        {resetConfirm ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-3"
          >
            <p className="text-sm text-negative">Are you sure? This cannot be undone.</p>
            <button
              onClick={handleReset}
              className="bg-negative text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-negative/80 transition-colors"
            >
              Yes, reset everything
            </button>
            <button
              onClick={() => setResetConfirm(false)}
              className="btn-ghost text-sm"
            >
              Cancel
            </button>
          </motion.div>
        ) : (
          <button
            onClick={handleReset}
            className="flex items-center gap-2 text-negative border border-negative/20 bg-negative/5 hover:bg-negative/10 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Reset workspace
          </button>
        )}
      </div>

      {isDemoMode && (
        <div className="mt-4 p-4 bg-amber/5 border border-amber/20 rounded-xl text-sm text-amber/80">
          You're in demo mode. Settings changes are local only and won't be saved after refresh.
        </div>
      )}
    </PageTransition>
  );
}
