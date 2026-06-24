import { useApp } from '../context/AppContext';
import Card from '../components/common/Card';
import StatCard from '../components/analytics/StatCard';
import CategoryChart from '../components/analytics/CategoryChart';
import WeeklyChart from '../components/analytics/WeeklyChart';
import PromptFrequencyChart from '../components/analytics/PromptFrequencyChart';

export default function AnalyticsPage() {
  const { analytics } = useApp();

  return (
    <div className="space-y-4 pb-6 sm:pb-0">
      <Card>
        <div className="mb-5 sm:mb-6">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Dashboard</p>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 sm:text-3xl">Analytics</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Track chat volume, category usage, and prompt frequency across your workspace.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total chats" value={analytics.totalChats} />
          <StatCard label="Total messages" value={analytics.totalMessages} />
          <StatCard label="Active categories" value={analytics.categoryUsage.filter((c) => c.value > 0).length} />
          <StatCard label="Saved prompts used" value={analytics.promptFrequency.reduce((s, p) => s + p.value, 0)} />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">Category usage</h3>
          <div className="h-56 sm:h-64">
            <CategoryChart data={analytics.categoryUsage} />
          </div>
        </Card>

        <Card>
          <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">Weekly activity</h3>
          <div className="h-56 sm:h-64">
            <WeeklyChart data={analytics.weeklyActivity} />
          </div>
        </Card>
      </div>

      <Card>
        <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">Prompt frequency</h3>
        <div className="h-56 sm:h-64">
          <PromptFrequencyChart data={analytics.promptFrequency} />
        </div>
      </Card>
    </div>
  );
}
