import { createContext, useContext, useCallback, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import Toast from '../components/common/Toast';

const NotificationContext = createContext(null);

let toastId = 0;

export function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const recentToastKeysRef = useRef(new Map());

  const notify = useCallback((title, message, type = 'success') => {
    const key = `${type}::${title}::${message}`;
    const now = Date.now();
    const lastShownAt = recentToastKeysRef.current.get(key);

    // Prevent the same toast from appearing twice in quick succession.
    if (lastShownAt && now - lastShownAt < 1000) {
      return;
    }

    recentToastKeysRef.current.set(key, now);
    setTimeout(() => {
      const seenAt = recentToastKeysRef.current.get(key);
      if (seenAt === now) {
        recentToastKeysRef.current.delete(key);
      }
    }, 1500);

    const id = ++toastId;
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <Toast key={toast.id} {...toast} onDismiss={() => dismiss(toast.id)} />
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be used within NotificationProvider');
  return ctx;
}
