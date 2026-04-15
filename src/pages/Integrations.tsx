import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, XCircle, Loader2, ChevronDown, ChevronUp,
  RefreshCw, Trash2, ExternalLink, Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageTransition } from '../components/PageTransition';
import { Tooltip } from '../components/Tooltip';
import { useAppStore } from '../lib/store';
import { saveWorkspace } from '../lib/hooks/useWorkspace';
import { getIntegrations, upsertIntegration, deleteIntegration, touchSyncTime } from '../lib/integrations/db';
import { testLinearConnection, getLinearTeams, getLinearVelocity } from '../lib/integrations/linear';
import { testGitHubConnection, getGitHubRepos, getGitHubVelocity } from '../lib/integrations/github';
import { testJiraConnection, getJiraProjects, getJiraVelocity } from '../lib/integrations/jira';
import type { Integration, LinearTeam, GitHubRepo, JiraProject, VelocityResult } from '../lib/integrations/types';

// ─── Period picker ─────────────────────────────────────────────────────────────

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const YEARS = ['2023','2024','2025','2026'];

function PeriodSelect({
  label, value, onChange,
}: {
  label: string;
  value: { month: string; year: string };
  onChange: (v: { month: string; year: string }) => void;
}) {
  return (
    <div>
      <p className="text-xs text-white/40 mb-1.5">{label}</p>
      <div className="flex gap-2">
        <select
          value={value.month}
          onChange={(e) => onChange({ ...value, month: e.target.value })}
          className="input-dark flex-1 text-sm"
        >
          {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select
          value={value.year}
          onChange={(e) => onChange({ ...value, year: e.target.value })}
          className="input-dark w-24 text-sm"
        >
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
    </div>
  );
}

// ─── Velocity preview ─────────────────────────────────────────────────────────

function VelocityPreview({
  result, label,
}: {
  result: VelocityResult; label: string;
}) {
  return (
    <div className="bg-obsidian border border-white/[0.06] rounded-xl p-4 mt-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3">{label}</p>
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <div className="text-xs text-white/30 mb-0.5">Tickets found</div>
          <div className="font-mono text-lg text-accent">{result.totalTickets}</div>
        </div>
        <div>
          <div className="text-xs text-white/30 mb-0.5">Unique devs</div>
          <div className="font-mono text-lg text-white/80">{result.uniqueDevs}</div>
        </div>
        <div>
          <div className="text-xs text-white/30 mb-0.5">Avg / dev / mo</div>
          <div className="font-mono text-lg text-positive">{result.avgTicketsPerDevPerMonth.toFixed(1)}</div>
        </div>
      </div>
      {result.devBreakdown.slice(0, 4).map((d) => (
        <div key={d.name} className="flex justify-between text-xs text-white/40 py-0.5">
          <span>{d.name}</span>
          <span className="font-mono">{d.tickets} tickets</span>
        </div>
      ))}
      {result.devBreakdown.length > 4 && (
        <p className="text-xs text-white/25 mt-1">+{result.devBreakdown.length - 4} more devs</p>
      )}
    </div>
  );
}

// ─── Import modal (shared) ────────────────────────────────────────────────────

function ImportModal({
  title,
  onFetch,
  onApply,
  onClose,
}: {
  title: string;
  onFetch: (baselineFrom: Date, baselineTo: Date, currentFrom: Date, currentTo: Date) => Promise<{ baseline: VelocityResult; current: VelocityResult }>;
  onApply: (baseline: VelocityResult, current: VelocityResult, periods: { baselineFrom: Date; baselineTo: Date; currentFrom: Date; currentTo: Date }) => Promise<void>;
  onClose: () => void;
}) {
  const [baselineStart, setBaselineStart] = useState({ month: 'Jan', year: '2024' });
  const [baselineEnd, setBaselineEnd] = useState({ month: 'Jun', year: '2024' });
  const [currentStart, setCurrentStart] = useState({ month: 'Jul', year: '2024' });
  const [currentEnd, setCurrentEnd] = useState({ month: 'Dec', year: '2024' });
  const [results, setResults] = useState<{ baseline: VelocityResult; current: VelocityResult } | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);

  const toDate = (m: string, y: string, end = false) => {
    const month = MONTHS.indexOf(m);
    return end ? new Date(Number(y), month + 1, 0) : new Date(Number(y), month, 1);
  };

  const handleFetch = async () => {
    setLoading(true);
    setResults(null);
    try {
      const res = await onFetch(
        toDate(baselineStart.month, baselineStart.year),
        toDate(baselineEnd.month, baselineEnd.year, true),
        toDate(currentStart.month, currentStart.year),
        toDate(currentEnd.month, currentEnd.year, true),
      );
      setResults(res);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!results) return;
    setApplying(true);
    try {
      await onApply(results.baseline, results.current, {
        baselineFrom: toDate(baselineStart.month, baselineStart.year),
        baselineTo: toDate(baselineEnd.month, baselineEnd.year, true),
        currentFrom: toDate(currentStart.month, currentStart.year),
        currentTo: toDate(currentEnd.month, currentEnd.year, true),
      });
      toast.success('Workspace updated with real data!');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to apply data');
    } finally {
      setApplying(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="glass border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl"
      >
        <h3 className="font-heading text-lg font-bold text-white mb-1">{title}</h3>
        <p className="text-sm text-white/40 mb-5">Select your baseline and current periods to calculate velocity lift.</p>

        <div className="space-y-4 mb-5">
          <div className="card p-4 space-y-3">
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Baseline — before AI</p>
            <div className="grid grid-cols-2 gap-3">
              <PeriodSelect label="Start" value={baselineStart} onChange={setBaselineStart} />
              <PeriodSelect label="End" value={baselineEnd} onChange={setBaselineEnd} />
            </div>
          </div>
          <div className="card p-4 space-y-3">
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Current — after AI</p>
            <div className="grid grid-cols-2 gap-3">
              <PeriodSelect label="Start" value={currentStart} onChange={setCurrentStart} />
              <PeriodSelect label="End" value={currentEnd} onChange={setCurrentEnd} />
            </div>
          </div>
        </div>

        <button
          onClick={handleFetch}
          disabled={loading}
          className="btn-ghost w-full flex items-center justify-center gap-2 mb-4"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {loading ? 'Fetching from API…' : 'Preview data'}
        </button>

        {results && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <VelocityPreview result={results.baseline} label="Baseline period" />
            <VelocityPreview result={results.current} label="Current period" />
            <button
              onClick={handleApply}
              disabled={applying}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-4"
            >
              {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Apply to workspace
            </button>
          </motion.div>
        )}

        <button onClick={onClose} className="text-xs text-white/30 hover:text-white/60 w-full text-center mt-3 transition-colors">
          Cancel
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── Individual integration cards ─────────────────────────────────────────────

type CardState = 'idle' | 'connecting' | 'testing' | 'connected';

function LinearCard({ existing, workspaceId, onSaved }: { existing?: Integration; workspaceId: string; onSaved: () => void }) {
  const { workspace, setWorkspace, user } = useAppStore();
  const [open, setOpen] = useState(!existing);
  const [apiKey, setApiKey] = useState((existing?.config as { apiKey?: string })?.apiKey ?? '');
  const [state, setState] = useState<CardState>(existing ? 'connected' : 'idle');
  const [teams, setTeams] = useState<LinearTeam[]>([]);
  const [selectedTeam, setSelectedTeam] = useState((existing?.config as { teamId?: string })?.teamId ?? '');
  const [importing, setImporting] = useState(false);

  const handleConnect = async () => {
    if (!apiKey.trim()) return;
    setState('testing');
    try {
      const name = await testLinearConnection(apiKey);
      const fetchedTeams = await getLinearTeams(apiKey);
      setTeams(fetchedTeams);
      if (fetchedTeams.length > 0) setSelectedTeam(fetchedTeams[0].id);
      await upsertIntegration(workspaceId, 'linear', { apiKey, teamId: fetchedTeams[0]?.id, teamName: fetchedTeams[0]?.name });
      setState('connected');
      toast.success(`Connected to Linear as ${name}`);
      onSaved();
    } catch (err) {
      setState('idle');
      toast.error(err instanceof Error ? err.message : 'Connection failed');
    }
  };

  const handleImport = async (baseline: VelocityResult, current: VelocityResult, periods: { baselineFrom: Date; baselineTo: Date; currentFrom: Date; currentTo: Date }) => {
    if (!workspace || !user) throw new Error('No workspace');
    const toYM = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const updated = await saveWorkspace(user.id, {
      ...workspace,
      team_size: Math.max(baseline.uniqueDevs, current.uniqueDevs),
      baseline_tickets_per_dev: parseFloat(baseline.avgTicketsPerDevPerMonth.toFixed(2)),
      baseline_start: toYM(periods.baselineFrom),
      baseline_end: toYM(periods.baselineTo),
      current_tickets_per_dev: parseFloat(current.avgTicketsPerDevPerMonth.toFixed(2)),
      current_period_start: toYM(periods.currentFrom),
      current_period_end: toYM(periods.currentTo),
    });
    if (updated) setWorkspace(updated);
  };

  const isConnected = state === 'connected' || !!existing;

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#5E6AD2]/15 border border-[#5E6AD2]/30 flex items-center justify-center text-lg">◈</div>
          <div>
            <p className="font-semibold text-white text-sm">Linear</p>
            <p className="text-xs text-white/40">Issue tracking &amp; sprint velocity</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isConnected
            ? <span className="flex items-center gap-1 text-xs text-positive"><CheckCircle2 className="w-3.5 h-3.5" /> Connected</span>
            : <span className="flex items-center gap-1 text-xs text-white/30"><XCircle className="w-3.5 h-3.5" /> Not connected</span>}
          <button onClick={() => setOpen(!open)} className="text-white/30 hover:text-white transition-colors ml-1">
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pt-4 mt-4 border-t border-white/[0.06] space-y-3">
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label className="text-xs text-white/50">API Key</label>
                  <Tooltip content="Get your Linear API key from Settings → API → Personal API keys in Linear." />
                </div>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="input-dark text-sm"
                  placeholder="lin_api_…"
                />
              </div>
              {teams.length > 0 && (
                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">Team</label>
                  <select value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)} className="input-dark text-sm">
                    {teams.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.memberCount} members)</option>)}
                  </select>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleConnect}
                  disabled={state === 'testing' || !apiKey.trim()}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm py-2"
                >
                  {state === 'testing' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isConnected ? 'Update' : 'Connect'}
                </button>
                {isConnected && (
                  <>
                    <button onClick={() => setImporting(true)} className="btn-ghost text-sm py-2 px-3 flex items-center gap-1.5">
                      <Download className="w-3.5 h-3.5" /> Import data
                    </button>
                    <button
                      onClick={async () => { await deleteIntegration(workspaceId, 'linear'); setState('idle'); onSaved(); toast.success('Disconnected Linear'); }}
                      className="p-2 rounded-lg hover:bg-negative/10 text-white/30 hover:text-negative transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {importing && (
          <ImportModal
            title="Import from Linear"
            onFetch={async (bf, bt, cf, ct) => ({
              baseline: await getLinearVelocity(apiKey, selectedTeam, bf, bt),
              current: await getLinearVelocity(apiKey, selectedTeam, cf, ct),
            })}
            onApply={handleImport}
            onClose={() => setImporting(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function GitHubCard({ existing, workspaceId, onSaved }: { existing?: Integration; workspaceId: string; onSaved: () => void }) {
  const { workspace, setWorkspace, user } = useAppStore();
  const [open, setOpen] = useState(!existing);
  const [token, setToken] = useState((existing?.config as { token?: string })?.token ?? '');
  const [owner, setOwner] = useState((existing?.config as { owner?: string })?.owner ?? '');
  const [state, setState] = useState<CardState>(existing ? 'connected' : 'idle');
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState((existing?.config as { repo?: string })?.repo ?? '');
  const [importing, setImporting] = useState(false);

  const handleConnect = async () => {
    if (!token.trim() || !owner.trim()) return;
    setState('testing');
    try {
      const login = await testGitHubConnection(token);
      const fetchedRepos = await getGitHubRepos(token, owner);
      setRepos(fetchedRepos);
      if (fetchedRepos.length > 0) setSelectedRepo(fetchedRepos[0].name);
      await upsertIntegration(workspaceId, 'github', { token, owner, repo: fetchedRepos[0]?.name });
      setState('connected');
      toast.success(`Connected to GitHub as ${login}`);
      onSaved();
    } catch (err) {
      setState('idle');
      toast.error(err instanceof Error ? err.message : 'Connection failed');
    }
  };

  const handleImport = async (baseline: VelocityResult, current: VelocityResult, periods: { baselineFrom: Date; baselineTo: Date; currentFrom: Date; currentTo: Date }) => {
    if (!workspace || !user) throw new Error('No workspace');
    const toYM = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const updated = await saveWorkspace(user.id, {
      ...workspace,
      team_size: Math.max(baseline.uniqueDevs, current.uniqueDevs),
      baseline_tickets_per_dev: parseFloat(baseline.avgTicketsPerDevPerMonth.toFixed(2)),
      baseline_start: toYM(periods.baselineFrom),
      baseline_end: toYM(periods.baselineTo),
      current_tickets_per_dev: parseFloat(current.avgTicketsPerDevPerMonth.toFixed(2)),
      current_period_start: toYM(periods.currentFrom),
      current_period_end: toYM(periods.currentTo),
    });
    if (updated) setWorkspace(updated);
  };

  const isConnected = state === 'connected' || !!existing;

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-lg">⌥</div>
          <div>
            <p className="font-semibold text-white text-sm">GitHub</p>
            <p className="text-xs text-white/40">PR merges &amp; issue velocity</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isConnected
            ? <span className="flex items-center gap-1 text-xs text-positive"><CheckCircle2 className="w-3.5 h-3.5" /> Connected</span>
            : <span className="flex items-center gap-1 text-xs text-white/30"><XCircle className="w-3.5 h-3.5" /> Not connected</span>}
          <button onClick={() => setOpen(!open)} className="text-white/30 hover:text-white transition-colors ml-1">
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pt-4 mt-4 border-t border-white/[0.06] space-y-3">
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label className="text-xs text-white/50">Personal Access Token</label>
                  <Tooltip content="Create at github.com → Settings → Developer settings → Personal access tokens. Needs repo and read:org scopes." width="w-72" />
                </div>
                <input type="password" value={token} onChange={(e) => setToken(e.target.value)} className="input-dark text-sm" placeholder="ghp_…" />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1.5 block">Organisation or username</label>
                <input value={owner} onChange={(e) => setOwner(e.target.value)} className="input-dark text-sm" placeholder="e.g. acmecorp" />
              </div>
              {repos.length > 0 && (
                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">Repository</label>
                  <select value={selectedRepo} onChange={(e) => setSelectedRepo(e.target.value)} className="input-dark text-sm">
                    {repos.map((r) => <option key={r.name} value={r.name}>{r.name}{r.private ? ' 🔒' : ''}</option>)}
                  </select>
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={handleConnect} disabled={state === 'testing' || !token.trim() || !owner.trim()}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm py-2">
                  {state === 'testing' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isConnected ? 'Update' : 'Connect'}
                </button>
                {isConnected && (
                  <>
                    <button onClick={() => setImporting(true)} className="btn-ghost text-sm py-2 px-3 flex items-center gap-1.5">
                      <Download className="w-3.5 h-3.5" /> Import data
                    </button>
                    <button onClick={async () => { await deleteIntegration(workspaceId, 'github'); setState('idle'); onSaved(); toast.success('Disconnected GitHub'); }}
                      className="p-2 rounded-lg hover:bg-negative/10 text-white/30 hover:text-negative transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {importing && (
          <ImportModal
            title="Import from GitHub"
            onFetch={async (bf, bt, cf, ct) => ({
              baseline: await getGitHubVelocity(token, owner, selectedRepo, bf, bt),
              current: await getGitHubVelocity(token, owner, selectedRepo, cf, ct),
            })}
            onApply={handleImport}
            onClose={() => setImporting(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function JiraCard({ existing, workspaceId, onSaved }: { existing?: Integration; workspaceId: string; onSaved: () => void }) {
  const { workspace, setWorkspace, user } = useAppStore();
  const [open, setOpen] = useState(!existing);
  const cfg = existing?.config as { domain?: string; email?: string; apiToken?: string; projectKey?: string } | undefined;
  const [domain, setDomain] = useState(cfg?.domain ?? '');
  const [email, setEmail] = useState(cfg?.email ?? '');
  const [apiToken, setApiToken] = useState(cfg?.apiToken ?? '');
  const [state, setState] = useState<CardState>(existing ? 'connected' : 'idle');
  const [projects, setProjects] = useState<JiraProject[]>([]);
  const [selectedProject, setSelectedProject] = useState(cfg?.projectKey ?? '');
  const [importing, setImporting] = useState(false);

  const handleConnect = async () => {
    if (!domain.trim() || !email.trim() || !apiToken.trim()) return;
    setState('testing');
    try {
      const name = await testJiraConnection(domain, email, apiToken);
      const fetchedProjects = await getJiraProjects(domain, email, apiToken);
      setProjects(fetchedProjects);
      if (fetchedProjects.length > 0) setSelectedProject(fetchedProjects[0].key);
      await upsertIntegration(workspaceId, 'jira', { domain, email, apiToken, projectKey: fetchedProjects[0]?.key });
      setState('connected');
      toast.success(`Connected to Jira as ${name}`);
      onSaved();
    } catch (err) {
      setState('idle');
      const msg = err instanceof Error ? err.message : 'Connection failed';
      toast.error(msg.includes('FunctionsFetchError') ? 'Jira edge function not deployed. See setup guide.' : msg);
    }
  };

  const handleImport = async (baseline: VelocityResult, current: VelocityResult, periods: { baselineFrom: Date; baselineTo: Date; currentFrom: Date; currentTo: Date }) => {
    if (!workspace || !user) throw new Error('No workspace');
    const toYM = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const updated = await saveWorkspace(user.id, {
      ...workspace,
      team_size: Math.max(baseline.uniqueDevs, current.uniqueDevs),
      baseline_tickets_per_dev: parseFloat(baseline.avgTicketsPerDevPerMonth.toFixed(2)),
      baseline_start: toYM(periods.baselineFrom),
      baseline_end: toYM(periods.baselineTo),
      current_tickets_per_dev: parseFloat(current.avgTicketsPerDevPerMonth.toFixed(2)),
      current_period_start: toYM(periods.currentFrom),
      current_period_end: toYM(periods.currentTo),
    });
    if (updated) setWorkspace(updated);
  };

  const isConnected = state === 'connected' || !!existing;

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#0052CC]/15 border border-[#0052CC]/30 flex items-center justify-center text-lg">◉</div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-white text-sm">Jira</p>
              <Tooltip content="Jira requires a one-time backend setup (Supabase Edge Function). See the setup guide below." />
            </div>
            <p className="text-xs text-white/40">Issue tracking &amp; sprint velocity</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isConnected
            ? <span className="flex items-center gap-1 text-xs text-positive"><CheckCircle2 className="w-3.5 h-3.5" /> Connected</span>
            : <span className="flex items-center gap-1 text-xs text-white/30"><XCircle className="w-3.5 h-3.5" /> Not connected</span>}
          <button onClick={() => setOpen(!open)} className="text-white/30 hover:text-white transition-colors ml-1">
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pt-4 mt-4 border-t border-white/[0.06] space-y-3">
              {/* Setup guide callout */}
              <div className="flex gap-2.5 p-3 bg-accent/5 border border-accent/15 rounded-lg text-xs text-white/50">
                <span className="text-accent mt-0.5 shrink-0">ℹ</span>
                <span>
                  Jira requires a proxy function to work. Run{' '}
                  <code className="text-accent/80 bg-white/5 px-1 py-0.5 rounded">supabase functions deploy jira-proxy</code>{' '}
                  from your project root first.{' '}
                  <a href="https://supabase.com/docs/guides/functions" target="_blank" rel="noopener noreferrer" className="text-accent underline-offset-2 hover:underline">
                    Docs <ExternalLink className="w-2.5 h-2.5 inline" />
                  </a>
                </span>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label className="text-xs text-white/50">Jira domain</label>
                  <Tooltip content="Your Atlassian domain, e.g. mycompany.atlassian.net (without https://)" />
                </div>
                <input value={domain} onChange={(e) => setDomain(e.target.value)} className="input-dark text-sm" placeholder="mycompany.atlassian.net" />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1.5 block">Atlassian email</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} className="input-dark text-sm" placeholder="you@company.com" type="email" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label className="text-xs text-white/50">API token</label>
                  <Tooltip content="Create at id.atlassian.com → Security → API tokens → Create API token." width="w-72" />
                </div>
                <input type="password" value={apiToken} onChange={(e) => setApiToken(e.target.value)} className="input-dark text-sm" placeholder="ATATT3x…" />
              </div>
              {projects.length > 0 && (
                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">Project</label>
                  <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} className="input-dark text-sm">
                    {projects.map((p) => <option key={p.key} value={p.key}>{p.name} ({p.key})</option>)}
                  </select>
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={handleConnect} disabled={state === 'testing' || !domain.trim() || !email.trim() || !apiToken.trim()}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm py-2">
                  {state === 'testing' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isConnected ? 'Update' : 'Connect'}
                </button>
                {isConnected && (
                  <>
                    <button onClick={() => setImporting(true)} className="btn-ghost text-sm py-2 px-3 flex items-center gap-1.5">
                      <Download className="w-3.5 h-3.5" /> Import data
                    </button>
                    <button onClick={async () => { await deleteIntegration(workspaceId, 'jira'); setState('idle'); onSaved(); toast.success('Disconnected Jira'); }}
                      className="p-2 rounded-lg hover:bg-negative/10 text-white/30 hover:text-negative transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {importing && (
          <ImportModal
            title="Import from Jira"
            onFetch={async (bf, bt, cf, ct) => ({
              baseline: await getJiraVelocity(domain, email, apiToken, selectedProject, bf, bt),
              current: await getJiraVelocity(domain, email, apiToken, selectedProject, cf, ct),
            })}
            onApply={handleImport}
            onClose={() => setImporting(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export function Integrations() {
  const { workspace } = useAppStore();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!workspace?.id) return;
    try {
      const data = await getIntegrations(workspace.id);
      setIntegrations(data);
    } catch {
      // Integrations table may not exist yet — non-fatal
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [workspace?.id]);

  const get = (p: string) => integrations.find((i) => i.provider === p);

  const connectedCount = integrations.length;

  if (!workspace) {
    return (
      <PageTransition>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <p className="text-white/40">Complete setup first to configure integrations.</p>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-white">Integrations</h1>
        <p className="text-sm text-white/40 mt-1">
          Connect your project management tools to pull real velocity data instead of entering it manually.
          {connectedCount > 0 && <span className="text-positive ml-2">● {connectedCount} connected</span>}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-white/30">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading integrations…</span>
        </div>
      ) : (
        <div className="space-y-4 max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
            <LinearCard existing={get('linear')} workspaceId={workspace.id} onSaved={load} />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
            <GitHubCard existing={get('github')} workspaceId={workspace.id} onSaved={load} />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
            <JiraCard existing={get('jira')} workspaceId={workspace.id} onSaved={load} />
          </motion.div>
        </div>
      )}

      {/* How it works */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-10 max-w-2xl"
      >
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">How it works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { step: '01', title: 'Connect your tool', body: 'Enter your API credentials. We only request read access.' },
            { step: '02', title: 'Select periods', body: 'Pick your before-AI baseline and your after-AI current period.' },
            { step: '03', title: 'Data auto-fills', body: 'We calculate avg tickets/dev/month and update your workspace.' },
          ].map((s) => (
            <div key={s.step} className="card p-4">
              <div className="font-mono text-xs text-accent/50 mb-2">{s.step}</div>
              <div className="text-sm font-semibold text-white mb-1">{s.title}</div>
              <div className="text-xs text-white/40 leading-relaxed">{s.body}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </PageTransition>
  );
}
