import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import SearchInput from '../common/SearchInput';

const slowSlide = {
  type: 'spring',
  stiffness: 170,
  damping: 24,
  mass: 0.9,
};

export default function Sidebar({ mobileOpen, onClose }) {
  const navigate = useNavigate();
  const {
    chats,
    selectedChatId,
    setSelectedChatId,
    deleteChat,
    searchTerm,
    setSearchTerm,
  } = useApp();

  const filteredChats = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return chats;

    return chats.filter((chat) =>
      [chat.title, chat.lastMessage, chat.updatedAt].some((value) =>
        value.toLowerCase().includes(query)
      )
    );
  }, [chats, searchTerm]);

  const handleSelect = (id) => {
    setSelectedChatId(id);
    navigate('/chat');
    onClose?.();
  };

  const sidebarContent = (
    <>
      <div>
        <p className="text-xs uppercase tracking-[0.4em] text-slate-400 dark:text-slate-300">Celume AI</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">Chat history</h2>
      </div>

      <div className="mt-6">
        <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search chats..." />
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400 dark:text-slate-300">Recents</p>
          <span className="text-xs text-slate-500 dark:text-slate-300">{filteredChats.length}</span>
        </div>

        <div className="space-y-3 overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {filteredChats.length === 0 ? (
              <motion.p
                key="empty"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-2xl bg-white/60 p-4 text-center text-sm text-slate-500 dark:bg-slate-900/80 dark:text-slate-300"
              >
                No chats found.
              </motion.p>
            ) : (
              filteredChats.map((chat, index) => {
                const isSelected = selectedChatId === chat.id;

                return (
                  <motion.div
                    key={chat.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.2, delay: index * 0.03 }}
                    className="relative"
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="active-chat-history"
                        className="absolute inset-0 rounded-2xl border border-accent-subtle bg-white shadow-soft dark:bg-slate-900/95"
                        transition={slowSlide}
                      />
                    )}
                    <div className="group relative rounded-2xl border border-transparent p-4 transition duration-500 hover:bg-white/70 dark:hover:bg-slate-900/80">
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleSelect(chat.id)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                            {chat.title}
                          </p>
                          <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-300">
                            {chat.lastMessage}
                          </p>
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteChat(chat.id)}
                          className="rounded-lg p-2 text-slate-400 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100 dark:text-slate-300 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
                          aria-label={`Delete ${chat.title}`}
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6h18" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 6V4h8v2" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6l1 15h10l1-15" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 11v6" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 11v6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );

  return (
    <>
      <aside className="hidden w-72 shrink-0 flex-col overflow-hidden rounded-3xl border border-white/70 bg-white/80 p-4 shadow-soft backdrop-blur-xl dark:border-slate-700 dark:bg-slate-950 lg:flex xl:w-80 xl:p-6">
        {sidebarContent}
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="fixed inset-0 z-40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="Close sidebar" />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 240 }}
              className="absolute left-0 top-0 flex h-full w-[88%] max-w-sm flex-col overflow-y-auto bg-white p-4 shadow-2xl dark:bg-slate-950 sm:p-6"
            >
              <div className="mb-4 flex justify-end">
                <button onClick={onClose} className="rounded-xl px-3 py-2 text-sm text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-900">
                  Close
                </button>
              </div>
              {sidebarContent}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
