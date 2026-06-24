import { useState } from 'react';
import Card from '../components/common/Card';

export default function TasksPage() {
  const [tasks] = useState([]);

  return (
    <div className="h-full space-y-4 overflow-y-auto pb-6 sm:space-y-6 sm:pb-0">
      <div>
        <h1 className="text-2xl font-bold text-slate-950 dark:text-slate-100 sm:text-3xl">Tasks</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">Track and manage your tasks</p>
      </div>

      {tasks.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-10 sm:py-12">
          <div className="text-center">
            <p className="text-6xl mb-4">✅</p>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">No tasks yet</h2>
            <p className="text-slate-600 dark:text-slate-400">Create a new task to get started</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <Card key={task.id} className="flex cursor-pointer flex-col gap-3 p-4 transition hover:shadow-lg sm:flex-row sm:items-center sm:gap-4">
              <input type="checkbox" className="w-5 h-5" />
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">{task.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">{task.description}</p>
              </div>
              <span className="w-fit rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-900 dark:bg-blue-900 dark:text-blue-100">
                {task.status}
              </span>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
