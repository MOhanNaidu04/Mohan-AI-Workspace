const variants = {
  primary: 'bg-accent-500 text-white hover:bg-accent-600',
  secondary:
    'bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700',
  ghost:
    'bg-transparent text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
  danger: 'bg-accent-500 text-white hover:bg-accent-600',
};

export default function Button({
  children,
  variant = 'primary',
  className = '',
  disabled,
  ...props
}) {
  return (
    <button
      disabled={disabled}
      className={`rounded-2xl px-4 py-2.5 text-sm font-semibold transition duration-500 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
