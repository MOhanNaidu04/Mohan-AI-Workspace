import { useState } from 'react';
import Card from '../components/common/Card';

export default function ProjectsPage() {
  const [projects] = useState([]);

  return (
    <div className="h-full space-y-4 overflow-y-auto pb-6 sm:space-y-6 sm:pb-0">
      <div>
        <h1 className="text-2xl font-bold text-slate-950 dark:text-slate-100 sm:text-3xl">Projects</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">Manage and organize your projects</p>
      </div>

      {projects.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-10 sm:py-12">
          <div className="text-center">
            <p className="text-6xl mb-4">📁</p>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">No projects yet</h2>
            <p className="text-slate-600 dark:text-slate-400">Create a new project to get started</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="p-4 cursor-pointer hover:shadow-lg transition">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">{project.name}</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{project.description}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
