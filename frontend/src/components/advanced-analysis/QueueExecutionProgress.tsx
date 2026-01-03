import React from 'react';
import type { QueueTask } from '../../types';
import { CheckCircle, XCircle, Clock, Loader2, PlayCircle, Calendar, FileText } from 'lucide-react';

interface QueueExecutionProgressProps {
  tasks: QueueTask[];
  executionMode?: 'direct' | 'review';
}

export const QueueExecutionProgress: React.FC<QueueExecutionProgressProps> = ({
  tasks,
  executionMode = 'review',
}) => {
  const totalTasks = tasks.length;
  // Calculate completed based on state
  const completedTasks = tasks.filter(t => t.state === 'completed' || t.state === 'failed').length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const plannedTasks = tasks.filter(t => t.state === 'planned').length;
  const isPlanning = tasks.some(t => t.state === 'planning');
  const isExecuting = tasks.some(t => t.state === 'executing');

  // Heuristic: If we have planned tasks but nothing completed/executing yet, we are likely in Phase 1 (Planning) of a Batch Job
  // But if totalTasks > 0 and completed == 0 and executing == 0, we assume startup/planning.
  const isPlanningPhase = (plannedTasks > 0 || isPlanning) && completedTasks === 0 && !isExecuting;

  // Helper to determine status icon
  const getStatusIcon = (state: string) => {
    switch (state) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'executing':
      case 'planning':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'planned': return <Calendar className="w-5 h-5 text-indigo-500" />;
      default: return <Clock className="w-5 h-5 text-gray-300" />;
    }
  };

  return (
    <div className="space-y-6">

      {/* Phase Indicator Banner */}
      {isPlanningPhase && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-indigo-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-indigo-900">Etapa 1: Generare Strategii Cercetare</h4>
              <p className="text-sm text-indigo-700 mt-1">
                Sistemul analizează și planifică fiecare task.
                <br />
                <span className="font-bold">Execuția va porni AUTOMAT</span> imediat ce toate planurile sunt gata. Nu este necesară intervenția dvs.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Overall Progress Bar */}
      <div>
        <div className="flex justify-between mb-2 text-sm font-medium text-gray-700">
          <span>Progres {isPlanningPhase ? 'Planificare' : 'Execuție'} ({isPlanningPhase ? plannedTasks : completedTasks}/{totalTasks})</span>
          <span>{isPlanningPhase ? (totalTasks > 0 ? Math.round((plannedTasks / totalTasks) * 100) : 0) : progressPercent}%</span>
        </div>
        <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ease-out ${isPlanningPhase ? 'bg-indigo-500' : 'bg-brand-accent'}`}
            style={{ width: `${isPlanningPhase ? (totalTasks > 0 ? Math.round((plannedTasks / totalTasks) * 100) : 0) : progressPercent}%` }}
          />
        </div>
      </div>

      {/* Current/Active Task Display */}
      <div className={`border rounded-lg p-4 ${isPlanningPhase ? 'bg-indigo-50 border-indigo-100' : 'bg-blue-50 border-blue-100'}`}>
        <h4 className={`text-sm font-semibold mb-2 flex items-center gap-2 ${isPlanningPhase ? 'text-indigo-800' : 'text-blue-800'}`}>
          <PlayCircle className="w-4 h-4" />
          {isPlanningPhase ? 'Se planifică acum:' : 'Execuție în curs:'}
        </h4>
        {tasks.find(t => t.state === 'executing' || t.state === 'planning') ? (
          <p className={`font-medium animate-pulse ${isPlanningPhase ? 'text-indigo-900' : 'text-blue-900'}`}>
            {tasks.find(t => t.state === 'executing' || t.state === 'planning')?.query}
          </p>
        ) : (
          <p className="text-gray-500 italic">
            {isPlanningPhase ? 'Se finalizează planificarea...' :
              (executionMode === 'direct' && tasks.some(t => t.state === 'pending'))
                ? 'Se așteaptă preluarea automată a următorului task...'
                : 'Se așteaptă următorul task sau execuția este completă.'}
          </p>
        )}
      </div>

      {/* Task List */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
        {tasks.map((task, idx) => (
          <div
            key={task.id}
            className={`flex items-center gap-3 p-3 rounded-lg border transition-colors
              ${(task.state === 'executing' || task.state === 'planning') ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-gray-100'}
              ${task.state === 'completed' ? 'bg-green-50 border-green-100' : ''}
              ${task.state === 'failed' ? 'bg-red-50 border-red-100' : ''}
              ${task.state === 'planned' ? 'bg-indigo-50 border-indigo-100' : ''}
            `}
          >
            <div className="flex-shrink-0">
              {getStatusIcon(task.state)}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${task.state === 'completed' ? 'text-gray-500' : 'text-gray-900'}`}>
                {task.query}
              </p>

              {/* Contextual Status Text */}
              {task.state === 'planned' && (
                <p className="text-xs text-indigo-600 font-medium">
                  {executionMode === 'direct' ? 'Planificat • Urmează la rând' : 'Planificat • Așteaptă Aprobare'}
                </p>
              )}
              {task.state === 'pending' && executionMode === 'direct' && (
                <p className="text-xs text-gray-400">În așteptare (Automat)</p>
              )}
              {task.state === 'planning' && (
                <p className="text-xs text-blue-600 font-medium animate-pulse">Se generează planul...</p>
              )}
              {task.state === 'executing' && (
                <p className="text-xs text-blue-600 font-medium animate-pulse">Se execută...</p>
              )}

              {task.state === 'failed' && (
                <p className="text-xs text-red-600 truncate">{task.error}</p>
              )}
            </div>
            <div className="text-xs text-gray-400 font-mono">
              #{idx + 1}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
