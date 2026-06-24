import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useNotification } from '../context/NotificationContext';
import Card from '../components/common/Card';
import CategoryFilter from '../components/prompts/CategoryFilter';
import PromptCard from '../components/prompts/PromptCard';
import { useState } from 'react';

export default function PromptsPage() {
  const { promptTemplates, favorites, toggleFavorite, usePromptTemplate, setDraftPrompt } = useApp();
  const { notify } = useNotification();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('');

  const filtered = promptTemplates.filter((p) => !filter || p.category === filter);

  const handleUse = (prompt) => {
    if (!prompt?.id || !prompt?.prompt?.trim()) {
      console.warn('[PromptsPage] handleUse called with invalid prompt:', prompt);
      notify('Invalid prompt', 'This prompt could not be loaded. Please try another.', 'error');
      return;
    }

    console.log('[PromptsPage] Using prompt template: "%s" (id: %s)', prompt.title, prompt.id);
    usePromptTemplate(prompt.id);
    setDraftPrompt(prompt.prompt);
    notify('Prompt ready', `"${prompt.title}" loaded — head to Chat to send.`);
    navigate('/');
  };

  const handleBookmark = (promptId) => {
    const isFavorite = favorites.includes(promptId);
    console.log(
      '[PromptsPage] %s prompt id "%s"',
      isFavorite ? 'Removing from' : 'Adding to',
      promptId
    );
    toggleFavorite(promptId);
  };

  const handleFilterChange = (newFilter) => {
    console.log('[PromptsPage] Category filter changed to:', newFilter || '(all)');
    setFilter(newFilter);
  };

  return (
    <div className="space-y-4 pb-6 sm:pb-0">
      <Card>
        <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Prompt library</p>
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 sm:text-3xl">Manage prompts</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Browse, bookmark, and reuse productivity templates across categories.
        </p>

        <div className="mt-4 overflow-x-auto pb-1">
          <CategoryFilter active={filter} onChange={handleFilterChange} />
        </div>
      </Card>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-slate-700 dark:text-slate-300 font-medium">No prompts found</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {filter
              ? `There are no prompts in the "${filter}" category. Try a different filter.`
              : 'No prompt templates are available.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((prompt) => (
            <PromptCard
              key={prompt.id}
              prompt={prompt}
              isFavorite={favorites.includes(prompt.id)}
              onBookmark={handleBookmark}
              onUse={handleUse}
            />
          ))}
        </div>
      )}
    </div>
  );
}
