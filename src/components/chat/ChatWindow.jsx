import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Button from '../common/Button';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import ChatInput from './ChatInput';

export default function ChatWindow({
  activeChat,
  messages,
  loading,
  promptValue,
  onPromptChange,
  onSendMessage,
  onSelectTemplate,
  quickTemplates,
  onExportText,
  onExportJSON,
  onNewChat,
  onCopyLink,
  onShare,
  onShareX,
  onShareWhatsApp,
  onShareLinkedIn,
  onCopyPrompt,
}) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: 'easeOut' }}
      className="flex min-h-[calc(100vh-12rem)] min-w-0 flex-col rounded-2xl border border-white/70 bg-white/80 shadow-lg shadow-slate-200/5 backdrop-blur-lg dark:border-slate-800 dark:bg-slate-950/80 dark:shadow-slate-950/5 sm:rounded-3xl lg:h-[calc(100vh-8rem)] lg:min-h-[640px]"
    >
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Active thread</p>
          <h1 className="break-words text-xl font-semibold text-slate-950 dark:text-slate-100 sm:text-2xl">
            {activeChat?.title || 'New conversation'}
          </h1>
          <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
            {activeChat?.lastMessage || 'Start a conversation to see your latest prompt here.'}
          </p>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:flex sm:flex-wrap sm:items-center sm:justify-end sm:gap-3">
          <Button onClick={onNewChat} className="!rounded-xl !px-3 !py-2 text-xs sm:text-sm">
            New chat
          </Button>
          <Button variant="secondary" onClick={onCopyLink} className="!rounded-xl !px-3 !py-2 text-xs sm:text-sm">
            Copy link
          </Button>
          <Button variant="secondary" onClick={onShare} className="!rounded-xl !px-3 !py-2 text-xs sm:text-sm">
            Share
          </Button>
          <Button variant="secondary" onClick={onShareX} className="!rounded-xl !px-3 !py-2 text-xs sm:text-sm">
            X
          </Button>
          <Button variant="secondary" onClick={onShareWhatsApp} className="!rounded-xl !px-3 !py-2 text-xs sm:text-sm">
            WhatsApp
          </Button>
          <Button variant="secondary" onClick={onShareLinkedIn} className="!rounded-xl !px-3 !py-2 text-xs sm:text-sm">
            LinkedIn
          </Button>
          <Button variant="secondary" onClick={onExportText} className="!rounded-xl !px-3 !py-2 text-xs sm:text-sm">
            Export TXT
          </Button>
          <Button variant="secondary" onClick={onExportJSON} className="!rounded-xl !px-3 !py-2 text-xs sm:text-sm">
            JSON
          </Button>
        </div>
      </div>

      <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
        {messages.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex min-h-[240px] flex-1 flex-col items-center justify-center text-center"
          >
            <div className="max-w-md rounded-2xl bg-white/5 p-5 backdrop-blur-md dark:bg-white/[0.02] sm:p-6">
              <p className="text-lg font-semibold text-slate-950 dark:text-slate-100">
                Start a conversation
              </p>
              <p className="mt-2 max-w-sm text-sm text-slate-600 dark:text-slate-400">
                Ask a question or pick a prompt template. Responses come from the connected model.
              </p>
            </div>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((message, index) => (
            <MessageBubble key={`${message.role}-${index}-${message.timestamp}`} message={message} index={index} />
          ))}
        </AnimatePresence>

        {loading && <TypingIndicator />}
      </div>

      <ChatInput
        value={promptValue}
        onChange={onPromptChange}
        onSend={onSendMessage}
        loading={loading}
        quickTemplates={quickTemplates}
        onSelectTemplate={onSelectTemplate}
        onCopyPrompt={onCopyPrompt}
      />
    </motion.div>
  );
}
