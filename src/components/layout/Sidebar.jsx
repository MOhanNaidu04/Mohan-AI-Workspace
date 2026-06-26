import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import SearchInput from '../common/SearchInput';
import Button from '../common/Button';
import { buildChatShareText, buildChatShareUrl, buildShareTargets } from '../../utils/shareChat';

const slowSlide = {
  type: 'spring',
  stiffness: 170,
  damping: 24,
  mass: 0.9,
};

export default function Sidebar({ mobileOpen, onClose }) {
  const navigate = useNavigate();
  const [openMenuId, setOpenMenuId] = useState('');
  const {
    chats,
    selectedChatId,
    setSelectedChatId,
    createNewChat,
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
    navigate(`/chat?chat=${encodeURIComponent(id)}`);
    onClose?.();
  };

  const handleNewChat = async () => {
    const chat = await createNewChat('business');
    navigate(`/chat?chat=${encodeURIComponent(chat.id)}`);
    onClose?.();
  };

  const handleCopyLink = async (chat) => {
    const url = buildChatShareUrl(chat.id);
    await navigator.clipboard.writeText(url);
    setOpenMenuId('');
  };

  const openShareTab = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
    setOpenMenuId('');
  };

  const handleShare = (chat, type) => {
    const url = buildChatShareUrl(chat.id);
    const text = buildChatShareText(chat.title);
    const targets = buildShareTargets(url, text);

    if (type === 'x') return openShareTab(targets.x);
    if (type === 'whatsapp') return openShareTab(targets.whatsapp);
    if (type === 'linkedin') return openShareTab(targets.linkedin);

    if (navigator.share) {
      navigator.share({ title: chat.title, text, url }).catch(() => {});
    } else {
      openShareTab(targets.x);
    }
  };

  const sidebarContent = (
    <>
      <div>
        <p className="text-xs uppercase tracking-[0.4em] text-slate-400 dark:text-slate-300">Mohan-ai-workspace</p>
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

        <Button onClick={handleNewChat} className="mb-3 w-full !rounded-2xl">
          + New chat
        </Button>

        <div className="space-y-3 pr-1">
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
                const isMenuOpen = openMenuId === chat.id;

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
                        <div className="relative shrink-0">
                          <button
                            type="button"
                            onClick={() => setOpenMenuId((current) => (current === chat.id ? '' : chat.id))}
                            className="rounded-lg p-2 text-slate-400 opacity-100 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                            aria-label={`More actions for ${chat.title}`}
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6h.01M12 12h.01M12 18h.01" />
                            </svg>
                          </button>

                          <AnimatePresence>
                            {isMenuOpen && (
                              <motion.div
                                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 6, scale: 0.98 }}
                                className="absolute right-0 top-10 z-20 w-44 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-950"
                              >
                                <button
                                  type="button"
                                  className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                                  onClick={() => handleCopyLink(chat)}
                                >
                                  Copy link
                                </button>
                                <button
                                  type="button"
                                  className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                                  onClick={() => handleShare(chat, 'x')}
                                >
                                  Share to X
                                </button>
                                <button
                                  type="button"
                                  className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                                  onClick={() => handleShare(chat, 'whatsapp')}
                                >
                                  Share to WhatsApp
                                </button>
                                <button
                                  type="button"
                                  className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                                  onClick={() => handleShare(chat, 'linkedin')}
                                >
                                  Share to LinkedIn
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteChat(chat.id)}
                                  className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm text-rose-600 transition hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/30"
                                >
                                  Delete chat
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
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
      <aside className="hidden w-72 shrink-0 flex-col overflow-visible rounded-3xl border border-white/70 bg-white/80 p-4 shadow-soft backdrop-blur-xl dark:border-slate-700 dark:bg-slate-950 lg:flex xl:w-80 xl:p-6">
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
