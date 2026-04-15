import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle } from 'lucide-react';

interface TooltipProps {
  content: string;
  children?: React.ReactNode;
  width?: string;
}

export function Tooltip({ content, children, width = 'w-60' }: TooltipProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children ?? (
        <HelpCircle className="w-3.5 h-3.5 text-white/20 hover:text-white/50 transition-colors cursor-help" />
      )}
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            transition={{ duration: 0.13 }}
            className={`absolute bottom-full mb-2.5 left-1/2 -translate-x-1/2 z-50 ${width} px-3 py-2.5 text-xs leading-relaxed text-white/75 bg-[#0D0F14] border border-white/10 rounded-xl shadow-2xl pointer-events-none`}
          >
            {content}
            {/* Arrow */}
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-[5px] w-2.5 h-2.5 bg-[#0D0F14] border-r border-b border-white/10 rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
