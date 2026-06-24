import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import Sidebar from './Sidebar';
import Header from './Header';
import { useTheme } from '../../hooks/useTheme';

export default function MainLayout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="flex min-h-screen w-full gap-3 p-2 sm:gap-4 sm:p-4 lg:gap-6 lg:p-6">
        <Sidebar mobileOpen={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />

        <motion.div
          initial={{ opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="hidden min-w-0 flex-1 flex-col overflow-hidden lg:flex"
        >
          <Header />
          <div className="mt-4 flex-1 overflow-y-auto">
            <Outlet />
          </div>
        </motion.div>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden lg:hidden">
          <div className="mb-3 flex items-center justify-between gap-3 sm:mb-4">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen((prev) => !prev)}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-soft transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/90 dark:text-white dark:hover:bg-slate-900"
              aria-label="Open navigation menu"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span>Menu</span>
            </button>
          </div>
          <Header />
          <div className="mt-3 flex-1 overflow-y-auto sm:mt-4">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
