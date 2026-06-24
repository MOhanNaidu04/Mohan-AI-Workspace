import { motion } from 'framer-motion';
import { formatTime } from '../../utils/formatTime';

export default function MessageBubble({ message, index }) {
  const isAssistant = message.role === 'assistant';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      layout
      transition={{ duration: 0.25, delay: index * 0.03 }}
      className={`flex w-full ${
        isAssistant ? 'justify-start' : 'justify-end'
      }`}
    >
      <div
        className={`max-w-[96%] min-w-0 rounded-2xl p-3 shadow-soft sm:max-w-[85%] sm:rounded-3xl sm:p-5 ${
          isAssistant
            ? 'bg-slate-100 dark:bg-slate-900'
            : 'bg-accent-500'
        }`}
      >
        <div
          className={`flex items-center justify-between gap-3 text-[11px] sm:text-xs ${
            isAssistant ? 'text-slate-500 dark:text-slate-400' : 'text-slate-700 dark:text-white/80'
          }`}
        >
          <span className="font-semibold">{isAssistant ? 'AI Assistant' : 'You'}</span>
          <span className="shrink-0">{message.timestamp ?? formatTime()}</span>
        </div>
        <p
          className={`mt-3 whitespace-pre-wrap break-words text-sm leading-6 sm:leading-7 ${
            isAssistant ? 'text-slate-800 dark:text-slate-100' : 'text-slate-950 dark:text-white'
          }`}
        >
          {message.text}
        </p>
      </div>
    </motion.div>
  );
}
