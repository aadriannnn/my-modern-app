import React from 'react';
import { QueueTask } from '../../types';
import { CheckCircle, XCircle, Clock, Loader2, PlayCircle } from 'lucide-react';

interface QueueExecutionProgressProps {
  tasks: QueueTask[];
  currentTaskIndex: number;
}

export const QueueExecutionProgress: React.FC<QueueExecutionProgressProps> = ({
  tasks,
  currentTaskIndex
}) => {
  const totalTasks = tasks.length;
  // Calculate completed based on state, not just index, to handle resumption
  const completedTasks = tasks.filter(t => t.state === 'completed' || t.state === 'failed').length;
  const progressPercent = Math.round((completedTasks / totalTasks) * 100);

  // Helper to determine status icon
  const getStatusIcon = (state: string) => {
    switch (state) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'executing': return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default: return <Clock className="w-5 h-5 text-gray-300" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Overall Progress Bar */}
      <div>
        <div className="flex justify-between mb-2 text-sm font-medium text-gray-700">
          <span>Progres Execuție ({completedTasks}/{totalTasks})</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-accent transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Current/Active Task Display */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
          <PlayCircle className="w-4 h-4" />
          Activitate Curentă
        </h4>
        {tasks.find(t => t.state === 'executing') ? (
           <p className="text-blue-900 font-medium animate-pulse">
             {tasks.find(t => t.state === 'executing')?.query}
           </p>
        ) : (
           <p className="text-gray-500 italic">Se așteaptă următorul task sau execuția este completă.</p>
        )}
      </div>

      {/* Task List */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
        {tasks.map((task, idx) => (
          <div
            key={task.id}
            className={`flex items-center gap-3 p-3 rounded-lg border transition-colors
              ${task.state === 'executing' ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-gray-100'}
              ${task.state === 'completed' ? 'bg-green-50 border-green-100' : ''}
              ${task.state === 'failed' ? 'bg-red-50 border-red-100' : ''}
            `}
          >
            <div className="flex-shrink-0">
              {getStatusIcon(task.state)}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${task.state === 'completed' ? 'text-gray-500' : 'text-gray-900'}`}>
                {task.query}
              </p>
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
