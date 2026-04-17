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
      <div className="relative z-10 max-w-2xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="font-heading text-3xl sm:text-5xl font-bold text-white mb-4 leading-tight">
            Is your AI spend<br />paying off?
          </h1>
          <p className="text-white/50 text-lg mb-10 max-w-md mx-auto">
            Enter your team's numbers. Get a clear answer on which subscriptions to keep, monitor, or cut.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
            <button
              onClick={() => navigate('/setup')}
              className="btn-primary flex items-center justify-center gap-2 px-8 py-3 text-base"
            >
              Calculate ROI <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleDemo}
              className="btn-ghost flex items-center justify-center gap-2 px-8 py-3 text-base"
            >
              See a demo
            </button>
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
