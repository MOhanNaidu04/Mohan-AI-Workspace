import { motion } from 'framer-motion';

export default function Card({ children, className = '', padding = 'p-4 sm:p-5' }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className={`min-w-0 rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-950/95 sm:rounded-3xl ${padding} ${className}`}
    >
      {children}
    </motion.section>
  );
}
