import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Layers,
  Users,
  FileText,
  ArrowRight,
  Zap,
  ChevronRight,
} from 'lucide-react';
import { MeshBackground } from '../components/MeshBackground';
import { useAppStore } from '../lib/store';
import { useCountUpOnVisible } from '../lib/hooks/useCountUp';

const features = [
  {
    icon: TrendingUp,
    title: 'Measure velocity lift',
    desc: 'Compare ticket throughput before and after AI adoption with real baseline data.',
  },
  {
    icon: Layers,
    title: 'Compare platforms',
    desc: 'See which tools are earning their keep — and which ones to reconsider at renewal.',
  },
  {
    icon: Users,
    title: 'Per-developer leverage',
    desc: 'Identify who is getting the most out of AI and who might need extra onboarding.',
  },
  {
    icon: FileText,
    title: 'Generate CBA reports',
    desc: 'One-click cost-benefit analysis you can share with leadership or finance.',
  },
];

function StatCounter({ end, prefix = '', suffix = '', label }: {
  end: number; prefix?: string; suffix?: string; label: string;
}) {
  const { ref, displayValue } = useCountUpOnVisible(end, { duration: 1800 });
  return (
    <div ref={ref} className="text-center">
      <div className="font-mono text-3xl font-medium text-accent mb-1">
        {prefix}{Math.round(displayValue).toLocaleString()}{suffix}
      </div>
      <div className="text-sm text-white/40">{label}</div>
    </div>
  );
}

export function Landing() {
  const navigate = useNavigate();
  const { loadDemoData, setAuthModalOpen } = useAppStore();

  const handleDemo = () => {
    loadDemoData();
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <MeshBackground />

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-accent/10 border border-accent/20 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-accent" />
          </div>
          <span className="font-heading text-lg font-bold text-white">DevROI</span>
        </div>
        <button
          onClick={() => setAuthModalOpen(true, 'signin')}
          className="btn-ghost text-sm"
        >
          Sign in
        </button>
      </nav>

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-16 pb-24 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="badge-cyan inline-flex items-center gap-1.5 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            For engineering managers
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="font-heading text-5xl md:text-7xl font-bold text-white leading-tight mb-6"
        >
          Do your AI tools
          <br />
          <span className="text-accent" style={{ textShadow: '0 0 40px rgba(0,212,255,0.3)' }}>
            actually pay off?
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg md:text-xl text-white/50 max-w-2xl mb-10 leading-relaxed"
        >
          Stop guessing. DevROI measures the real productivity value of every AI subscription
          your team uses — using the data you already have.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <button
            onClick={handleDemo}
            className="btn-primary flex items-center gap-2 text-base"
          >
            Try the demo
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setAuthModalOpen(true, 'signup')}
            className="btn-secondary flex items-center gap-2 text-base"
          >
            Sign up free
            <ChevronRight className="w-4 h-4" />
          </button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-xs text-white/25 mt-4"
        >
          No credit card. No Jira connection required to start.
        </motion.p>
      </section>

      {/* Stats strip */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="relative z-10 border-y border-white/[0.06] bg-card-dark/40 py-12"
      >
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-3 gap-8">
          <StatCounter end={5200} prefix="$" label="avg monthly value created per team" />
          <StatCounter end={42} suffix="%" label="avg velocity lift reported" />
          <StatCounter end={38} suffix="×" label="median ROI on AI spend (tenths)" />
        </div>
      </motion.section>

      {/* Feature grid */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="font-heading text-3xl font-bold text-white mb-3">
              Everything you need to justify the spend
            </h2>
            <p className="text-white/40 text-base">
              Built for managers who already have the data — just not the dashboard.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="card p-6 flex gap-4"
              >
                <div className="w-10 h-10 bg-accent/10 border border-accent/20 rounded-xl flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">{title}</h3>
                  <p className="text-sm text-white/40 leading-relaxed">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="relative z-10 py-8 border-y border-white/[0.04]"
      >
        <p className="text-center text-sm text-white/30">
          Teams using DevROI are running:&nbsp;&nbsp;
          <span className="text-white/60">Claude</span>&nbsp;·&nbsp;
          <span className="text-white/60">ChatGPT</span>&nbsp;·&nbsp;
          <span className="text-white/60">GitHub Copilot</span>&nbsp;·&nbsp;
          <span className="text-white/60">Gemini</span>&nbsp;·&nbsp;
          <span className="text-white/60">Cursor</span>
        </p>
      </motion.section>

      {/* CTA Banner */}
      <section className="relative z-10 py-20 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center"
        >
          <h2 className="font-heading text-3xl font-bold text-white mb-4">
            Ready to see the numbers?
          </h2>
          <p className="text-white/40 mb-8">
            Load the demo in 10 seconds and see exactly what DevROI shows your team.
          </p>
          <button onClick={handleDemo} className="btn-primary flex items-center gap-2 mx-auto text-base">
            Try the demo now
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.06] py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-accent/60" />
            <span className="text-sm text-white/30">
              DevROI — Built as a product concept
            </span>
          </div>
          <p className="text-xs text-white/20 text-center">
            Demo mode stores nothing. Real accounts use Supabase + row-level security.
          </p>
          <a
            href="https://linkedin.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            Built by an engineering manager, for engineering managers
          </a>
        </div>
      </footer>
    </div>
  );
}
