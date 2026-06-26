import { motion } from 'framer-motion';
import Badge from '../common/Badge';
import { getCategoryLabel } from '../../data/categories';

export default function PromptCard({ prompt, isFavorite, onBookmark, onUse, onCopy }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="rounded-2xl border border-accent-subtle bg-slate-50 p-4 transition duration-500 hover:border-accent dark:bg-slate-900"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{prompt.title}</p>
            <Badge category={prompt.category} label={getCategoryLabel(prompt.category)} />
          </div>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{prompt.description}</p>
          <p className="mt-2 line-clamp-2 text-xs text-slate-400 dark:text-slate-500">{prompt.prompt}</p>
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          <button
            type="button"
            onClick={() => onBookmark(prompt.id)}
            className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold transition hover:border-accent dark:border-slate-700 dark:bg-slate-950"
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            {isFavorite ? 'Saved' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => onCopy?.(prompt)}
            className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold transition hover:border-accent dark:border-slate-700 dark:bg-slate-950"
            aria-label={`Copy prompt ${prompt.title}`}
          >
            Copy
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onUse(prompt)}
        className="mt-3 text-xs font-semibold text-accent-600 transition hover:text-accent-500"
      >
        Use this prompt
      </button>
    </motion.div>
  );
}
