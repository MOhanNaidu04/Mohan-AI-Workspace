import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTheme } from '../../hooks/useTheme';
import Button from '../common/Button';
import ProfileDropdown from '../common/ProfileDropdown';

const navItems = [
  { to: '/chat', label: 'Chats' },
  { to: '/prompts', label: 'Prompts' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/settings', label: 'Settings' },
];

const slowSlide = {
  type: 'spring',
  stiffness: 170,
  damping: 24,
  mass: 0.9,
};

export default function Header() {
  const { toggleTheme, isDark } = useTheme();
  const location = useLocation();

  const activeItem = navItems.find((item) => location.pathname === item.to)?.to ?? '/chat';
  const [selectedItem, setSelectedItem] = useState(activeItem);
  const selectedIndex = Math.max(
    0,
    navItems.findIndex((item) => item.to === selectedItem)
  );

  useEffect(() => {
    setSelectedItem(activeItem);
  }, [activeItem]);

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className="rounded-2xl border border-slate-200 bg-white p-3 shadow-soft dark:border-slate-800 dark:bg-slate-950/95 sm:rounded-3xl sm:p-5"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between xl:gap-6">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.32em] text-slate-500 dark:text-slate-400">Workspace</p>
          <h1 className="mt-2 truncate text-2xl font-semibold text-slate-900 dark:text-slate-100 sm:mt-3 sm:text-3xl">Celume AI</h1>
        </div>

        <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-center">
          <nav className="relative grid min-w-0 grid-cols-4 rounded-2xl bg-slate-100 p-1 dark:bg-slate-900 sm:rounded-full">
            <div className="pointer-events-none absolute inset-1">
              <motion.span
                className="block h-full w-1/4 rounded-full bg-white shadow-sm dark:bg-slate-800"
                animate={{ x: `${selectedIndex * 100}%` }}
                transition={slowSlide}
              />
            </div>
            {navItems.map((item) => {
              const isSelected = selectedItem === item.to;

              return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSelectedItem(item.to)}
                className={`relative z-10 min-w-0 rounded-2xl px-2 py-2 text-center text-[11px] font-medium leading-tight transition duration-500 sm:rounded-full sm:px-4 sm:text-sm ${
                  isSelected
                    ? 'text-slate-900 dark:text-slate-100'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {item.label}
              </Link>
              );
            })}
          </nav>
          <div className="flex items-center justify-between gap-3 md:justify-start">
            <Button
              variant="ghost"
              onClick={toggleTheme}
              className="!px-3 flex items-center justify-center gap-2"
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <span className="text-sm font-medium">{isDark ? 'Light' : 'Dark'}</span>
              <span className="hidden sm:inline text-sm font-medium">mode</span>
            </Button>
            <div className="hidden h-8 w-px bg-slate-200 dark:bg-slate-700 md:block" />
            <ProfileDropdown />
          </div>
        </div>
      </div>
    </motion.header>
  );
}
