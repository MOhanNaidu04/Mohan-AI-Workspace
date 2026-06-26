import { useApp } from '../context/AppContext';
import { useNotification } from '../context/NotificationContext';
import { useTheme } from '../hooks/useTheme';
import { useAccentColor } from '../hooks/useAccentColor';
import { exportChatAsText, exportChatAsJSON, downloadFile } from '../utils/exportChat';
import Card from '../components/common/Card';
import Button from '../components/common/Button';

const accentColors = {
  sky: 'bg-sky-500',
  violet: 'bg-violet-500',
  rose: 'bg-rose-500',
};

const accentRings = {
  sky: 'ring-sky-400',
  violet: 'ring-violet-400',
  rose: 'ring-rose-400',
};

export default function SettingsPage() {
  const { selectedChat, messages } = useApp();
  const { theme, toggleTheme } = useTheme();
  const { accentColor, changeAccentColor } = useAccentColor();
  const { notify } = useNotification();

  const handleExportText = () => {
    if (!selectedChat) {
      console.warn('[SettingsPage] Export TXT requested but no chat is selected.');
      notify('No chat selected', 'Please open a chat before exporting.', 'error');
      return;
    }
    if (!messages || messages.length === 0) {
      console.warn('[SettingsPage] Export TXT requested but the current chat has no messages.');
      notify('Nothing to export', 'The current chat has no messages to export.', 'error');
      return;
    }

    const filename = `${selectedChat.title.replace(/\s+/g, '-')}.txt`;
    console.log('[SettingsPage] Exporting chat "%s" as TXT → %s', selectedChat.title, filename);

    try {
      const content = exportChatAsText(selectedChat, messages);
      downloadFile(content, filename);
      notify('Export complete', 'Chat exported as text file.');
    } catch (err) {
      console.error('[SettingsPage] TXT export failed:', err);
      notify('Export failed', 'An unexpected error occurred while exporting the chat.', 'error');
    }
  };

  const handleExportJSON = () => {
    if (!selectedChat) {
      console.warn('[SettingsPage] Export JSON requested but no chat is selected.');
      notify('No chat selected', 'Please open a chat before exporting.', 'error');
      return;
    }
    if (!messages || messages.length === 0) {
      console.warn('[SettingsPage] Export JSON requested but the current chat has no messages.');
      notify('Nothing to export', 'The current chat has no messages to export.', 'error');
      return;
    }

    const filename = `${selectedChat.title.replace(/\s+/g, '-')}.json`;
    console.log('[SettingsPage] Exporting chat "%s" as JSON → %s', selectedChat.title, filename);

    try {
      const content = exportChatAsJSON(selectedChat, messages);
      downloadFile(content, filename, 'application/json');
      notify('Export complete', 'Chat exported as JSON file.');
    } catch (err) {
      console.error('[SettingsPage] JSON export failed:', err);
      notify('Export failed', 'An unexpected error occurred while exporting the chat.', 'error');
    }
  };

  const handleClearData = () => {
    if (window.confirm('Clear all local data? This will remove all chats, favorites, and settings. This cannot be undone.')) {
      console.warn('[SettingsPage] User confirmed — clearing all localStorage data and reloading.');
      localStorage.clear();
      window.location.reload();
    } else {
      console.log('[SettingsPage] Clear data cancelled by user.');
    }
  };

  const handleAccentChange = (color) => {
    if (!accentColors[color]) {
      console.warn('[SettingsPage] Unknown accent color requested:', color);
      return;
    }
    console.log('[SettingsPage] Accent color changed from "%s" to "%s"', accentColor, color);
    changeAccentColor(color);
    notify('Theme updated', `Accent color set to ${color}.`);
  };

  return (
    <div className="space-y-4">
      {/* ── Preferences ──────────────────────────────────────────────────────── */}
      <Card>
        <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Preferences</p>
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Settings</h2>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {/* Appearance */}
          <div className="rounded-2xl bg-slate-100 p-5 dark:bg-slate-900">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Appearance</p>
            <p className="mt-1 text-xs text-slate-500">Currently in {theme} mode</p>
            <Button
              variant="secondary"
              onClick={() => {
                console.log('[SettingsPage] Toggling theme from "%s"', theme);
                toggleTheme();
              }}
              className="mt-4"
            >
              Switch to {theme === 'dark' ? 'light' : 'dark'} mode
            </Button>
          </div>

          {/* Accent Color */}
          <div className="rounded-2xl bg-slate-100 p-5 dark:bg-slate-900">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Accent color</p>
            <div className="mt-3 flex gap-2">
              {['sky', 'violet', 'rose'].map((color) => (
                <button
                  key={color}
                  onClick={() => handleAccentChange(color)}
                  className={`h-8 w-8 rounded-full ${accentColors[color]} ring-2 ring-offset-2 ring-offset-slate-100 transition dark:ring-offset-slate-900 ${
                    accentColor === color ? accentRings[color] : 'ring-transparent'
                  }`}
                  aria-label={`Set accent color to ${color}`}
                  title={color.charAt(0).toUpperCase() + color.slice(1)}
                />
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* ── Export ───────────────────────────────────────────────────────────── */}
      <Card>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Export current chat</p>
        <p className="mt-1 text-xs text-slate-500">
          {selectedChat
            ? `Download "${selectedChat.title}" as text or JSON.`
            : 'No chat is currently selected.'}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={handleExportText}>Export as .txt</Button>
          <Button variant="secondary" onClick={handleExportJSON}>
            Export as .json
          </Button>
        </div>
      </Card>

      {/* ── Danger Zone ──────────────────────────────────────────────────────── */}
      <Card>
        <p className="text-sm font-medium text-rose-600 dark:text-rose-400">Danger zone</p>
        <p className="mt-1 text-xs text-slate-500">
          Permanently clear all chats, favorites, and settings stored locally. This cannot be undone.
        </p>
        <Button variant="danger" onClick={handleClearData} className="mt-4">
          Clear all data
        </Button>
      </Card>
    </div>
  );
}
