import { createContext, useContext, useCallback, useMemo, useState } from 'react';
import { initialChats, createEmptyChat } from '../data/chats';
import { promptTemplates } from '../data/prompts';
import { categories, getCategoryLabel } from '../data/categories';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { apiUrl } from '../utils/api';
import { formatTime, formatRelativeTime } from '../utils/formatTime';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [chats, setChats] = useLocalStorage('celume-chats', initialChats);
  const [selectedChatId, setSelectedChatId] = useLocalStorage('celume-selected-chat', initialChats[0].id);
  const [favorites, setFavorites] = useLocalStorage('celume-favorites', ['launch-copy']);
  const [promptUsage, setPromptUsage] = useLocalStorage('celume-prompt-usage', {});
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [draftPrompt, setDraftPrompt] = useState('');
  const [messagesByChat, setMessagesByChat] = useLocalStorage('celume-messages', () => {
    const map = {};
    initialChats.forEach((chat) => {
      map[chat.id] = chat.thread.map((m) => ({ ...m, timestamp: formatTime() }));
    });
    return map;
  });

  const selectedChat = useMemo(
    () => chats.find((c) => c.id === selectedChatId) ?? chats[0],
    [chats, selectedChatId]
  );

  const messages = messagesByChat[selectedChatId] ?? [];

  const visibleChats = useMemo(() => {
    return chats.filter((chat) => {
      const matchesSearch =
        !searchTerm ||
        chat.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        chat.lastMessage.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !categoryFilter || chat.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [chats, searchTerm, categoryFilter]);

  const analytics = useMemo(() => {
    const categoryCounts = categories.map((cat) => ({
      name: cat.label,
      value: chats.filter((c) => c.category === cat.id).length,
    }));

    const promptFrequency = Object.entries(promptUsage)
      .map(([id, count]) => {
        const template = promptTemplates.find((p) => p.id === id);
        return { name: template?.title ?? id, value: count };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    const totalMessages = Object.values(messagesByChat).reduce((sum, msgs) => sum + msgs.length, 0);

    const weeklyActivity = [
      { day: 'Mon', value: Math.max(1, Math.floor(totalMessages * 0.12)) },
      { day: 'Tue', value: Math.max(1, Math.floor(totalMessages * 0.18)) },
      { day: 'Wed', value: Math.max(1, Math.floor(totalMessages * 0.15)) },
      { day: 'Thu', value: Math.max(1, Math.floor(totalMessages * 0.2)) },
      { day: 'Fri', value: Math.max(1, Math.floor(totalMessages * 0.16)) },
      { day: 'Sat', value: Math.max(1, Math.floor(totalMessages * 0.1)) },
      { day: 'Sun', value: Math.max(1, Math.floor(totalMessages * 0.09)) },
    ];

    return {
      totalChats: chats.length,
      totalMessages,
      categoryUsage: categoryCounts,
      promptFrequency: promptFrequency.length ? promptFrequency : [{ name: 'No data yet', value: 0 }],
      weeklyActivity,
    };
  }, [chats, promptUsage, messagesByChat]);

  const updateChatMeta = useCallback((chatId, updates) => {
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, ...updates } : c))
    );
  }, [setChats]);

  const sendMessage = useCallback(
    async (text, onNotify) => {
      if (!text.trim()) {
        console.warn('[AppContext] sendMessage called with empty text — ignoring.');
        return;
      }
      if (loading) {
        console.warn('[AppContext] sendMessage called while already loading — ignoring.');
        return;
      }

      console.log('[AppContext] Sending message to chat "%s" (id: %s): "%s"',
        selectedChat?.title, selectedChatId, text.trim().slice(0, 60));

      const userMessage = { role: 'user', text: text.trim(), timestamp: formatTime() };

      setMessagesByChat((prev) => ({
        ...prev,
        [selectedChatId]: [...(prev[selectedChatId] ?? []), userMessage],
      }));

      updateChatMeta(selectedChatId, {
        lastMessage: text.trim().slice(0, 80),
        updatedAt: formatRelativeTime(),
        title:
          selectedChat.title === 'New conversation'
            ? text.trim().slice(0, 40) + (text.length > 40 ? '...' : '')
            : selectedChat.title,
      });

      setLoading(true);

      try {
        console.log('[AppContext] Sending prompt to backend LLM for category "%s"...', selectedChat?.category);

        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('You are not signed in. Please log in again.');
        }

        const response = await fetch(apiUrl('/api/chat'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            prompt: text.trim(),
            category: selectedChat.category,
          }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.error || 'The backend AI request failed. Please try again.');
        }

        const answer = data.answer;
        const assistantMessage = { role: 'assistant', text: answer, timestamp: formatTime() };

        setMessagesByChat((prev) => ({
          ...prev,
          [selectedChatId]: [...(prev[selectedChatId] ?? []), assistantMessage],
        }));

        updateChatMeta(selectedChatId, {
          lastMessage: answer.slice(0, 80) + (answer.length > 80 ? '...' : ''),
          updatedAt: formatRelativeTime(),
        });

        console.log('[AppContext] AI response received (%d chars).', answer.length);
        onNotify?.('Response ready', 'AI replied to your message.');
      } catch (err) {
        console.error('[AppContext] AI simulation threw an error:', err);
        onNotify?.('Something went wrong', err.message || 'The AI could not generate a response. Please try again.', 'error');
      } finally {
        setLoading(false);
      }
    },
    [loading, selectedChatId, selectedChat, updateChatMeta, setMessagesByChat]
  );

  const usePromptTemplate = useCallback(
    (promptId) => {
      const template = promptTemplates.find((p) => p.id === promptId);
      if (!template) {
        console.warn('[AppContext] usePromptTemplate: no template found for id "%s"', promptId);
        return '';
      }

      console.log('[AppContext] Using prompt template "%s" (id: %s). Usage count: %d → %d',
        template.title, promptId,
        promptUsage[promptId] ?? 0, (promptUsage[promptId] ?? 0) + 1);

      setPromptUsage((prev) => ({
        ...prev,
        [promptId]: (prev[promptId] ?? 0) + 1,
      }));

      return template.prompt;
    },
    [setPromptUsage, promptUsage]
  );

  const toggleFavorite = useCallback(
    (promptId) => {
      setFavorites((prev) =>
        prev.includes(promptId) ? prev.filter((id) => id !== promptId) : [...prev, promptId]
      );
    },
    [setFavorites]
  );

  const createNewChat = useCallback(
    (category = 'business') => {
      console.log('[AppContext] Creating new chat with category "%s".', category);
      const chat = createEmptyChat(category);
      setChats((prev) => [chat, ...prev]);
      setMessagesByChat((prev) => ({ ...prev, [chat.id]: [] }));
      setSelectedChatId(chat.id);
      console.log('[AppContext] New chat created — id: %s, title: "%s"', chat.id, chat.title);
      return chat;
    },
    [setChats, setMessagesByChat, setSelectedChatId]
  );

  const deleteChat = useCallback(
    (chatId) => {
      const chatToDelete = chats.find((c) => c.id === chatId);
      if (!chatToDelete) {
        console.warn('[AppContext] deleteChat: chat id "%s" not found — nothing deleted.', chatId);
        return;
      }

      console.log('[AppContext] Deleting chat "%s" (id: %s). Chats remaining: %d',
        chatToDelete.title, chatId, chats.length - 1);

      const remainingChats = chats.filter((chat) => chat.id !== chatId);
      setChats(remainingChats);
      setMessagesByChat((prev) => {
        const { [chatId]: _deleted, ...rest } = prev;
        return rest;
      });

      if (selectedChatId === chatId) {
        if (remainingChats.length > 0) {
          console.log('[AppContext] Deleted selected chat — switching to: "%s"', remainingChats[0].title);
          setSelectedChatId(remainingChats[0].id);
        } else {
          console.log('[AppContext] No chats left after deletion — creating a fresh chat.');
          const newChat = createNewChat();
          setSelectedChatId(newChat.id);
        }
      }
    },
    [chats, createNewChat, selectedChatId, setChats, setMessagesByChat, setSelectedChatId]
  );

  const value = {
    chats,
    selectedChatId,
    setSelectedChatId,
    selectedChat,
    messages,
    loading,
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    visibleChats,
    favorites,
    toggleFavorite,
    sendMessage,
    usePromptTemplate,
    createNewChat,
    deleteChat,
    analytics,
    getCategoryLabel,
    categories,
    promptTemplates,
    draftPrompt,
    setDraftPrompt,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
