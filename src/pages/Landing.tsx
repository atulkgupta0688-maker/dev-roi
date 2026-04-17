import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TrendingUp, DollarSign, BarChart3, ArrowRight } from 'lucide-react';
import { MeshBackground } from '../components/MeshBackground';
import { useAppStore } from '../lib/store';

const FEATURES = [
  { icon: TrendingUp, text: 'Measure velocity lift from baseline to today' },
  { icon: DollarSign, text: 'See net ROI per subscription — Keep, Monitor, or Cut' },
  { icon: BarChart3, text: 'Track whether ROI improves month over month' },
];

const FLOATING_CARDS = [
  { value: '3.2×', label: 'Average ROI', color: '#00D4FF', delay: 0, x: '-55%', y: '-30%' },
  { value: '$42k', label: 'Saved per year', color: '#00FF94', delay: 0.4, x: '55%', y: '-20%' },
  { value: '5', label: 'Tools tracked', color: '#A78BFA', delay: 0.8, x: '45%', y: '35%' },
];

const float = (delay: number) => ({
  animate: {
    y: ['0px', '-10px', '0px'],
    transition: {
      duration: 4,
      delay,
      repeat: Infinity,
      ease: 'easeInOut' as const,
    },
  },
});

export function Landing() {
  const navigate = useNavigate();
  const { loadDemoData } = useAppStore();

  const handleDemo = () => {
    loadDemoData();
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden flex flex-col items-center justify-center">
      <MeshBackground />

      {/* Animated gradient blobs */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(0,212,255,0.07) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(167,139,250,0.08) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 w-[300px] h-[300px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(0,255,148,0.05) 0%, transparent 70%)',
          filter: 'blur(40px)',
          transform: 'translate(-50%, -50%)',
        }}
        animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
      />

      {/* Floating metric cards — desktop only */}
      {FLOATING_CARDS.map((card) => (
        <motion.div
          key={card.label}
          className="hidden lg:block absolute pointer-events-none"
          style={{ left: '50%', top: '50%', translateX: card.x, translateY: card.y }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: card.delay + 0.5 }}
        >
          <motion.div
            {...float(card.delay)}
            className="bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm rounded-2xl px-5 py-4 shadow-xl"
          >
            <div className="font-mono text-2xl font-bold mb-0.5" style={{ color: card.color }}>
              {card.value}
            </div>
            <div className="text-xs text-white/40">{card.label}</div>
          </motion.div>
        </motion.div>
      ))}

      {/* Hero */}
      <div className="relative z-10 max-w-2xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/[0.08] bg-white/[0.03] text-xs text-white/40 mb-6 font-mono"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            AI spend analytics
          </motion.div>

          <h1 className="font-heading text-4xl sm:text-6xl font-bold text-white mb-5 leading-tight tracking-tight">
            Is your AI spend<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-accent">
              actually working?
            </span>
          </h1>

          <p className="text-white/50 text-lg mb-10 max-w-md mx-auto leading-relaxed">
            Enter your team's numbers. Get a clear picture of which tools to keep, monitor, or cut.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-14">
            <motion.button
              onClick={() => navigate('/setup')}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="relative overflow-hidden flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-base font-semibold text-white"
              style={{
                background: 'linear-gradient(135deg, #00D4FF 0%, #0099CC 100%)',
                boxShadow: '0 0 0 0 rgba(0,212,255,0)',
                transition: 'box-shadow 0.2s ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 32px 4px rgba(0,212,255,0.25)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 0 0 rgba(0,212,255,0)';
              }}
            >
              Show me the numbers <ArrowRight className="w-4 h-4" />
            </motion.button>

            <motion.button
              onClick={handleDemo}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="btn-ghost flex items-center justify-center gap-2 px-8 py-3.5 text-base"
            >
              See a demo
            </motion.button>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-sm text-white/40">
                <Icon className="w-4 h-4 text-white/20 flex-shrink-0" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
