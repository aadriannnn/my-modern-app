import React from 'react';
import { QueueTask } from '../../types';
import { AlertCircle, CheckCircle, Clock, FileText, BarChart2 } from 'lucide-react';
import { Disclosure } from '@headlessui/react';
import { ChevronUpIcon } from '@heroicons/react/20/solid';

interface BatchPlanPreviewProps {
  tasks: QueueTask[];
  onApproveAll: () => void;
  onBack: () => void;
  isExecuting: boolean;
}

const StatCard = ({ icon: Icon, label, value, color }: any) => (
  <div className="bg-white p-4 rounded-lg border shadow-sm flex items-center space-x-3">
    <div className={`p-2 rounded-full ${color}`}>
      <Icon className="w-5 h-5 text-white" />
    </div>
    <div>
      <p className="text-xs text-gray-500 uppercase font-semibold">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
  </div>
);

export const BatchPlanPreview: React.FC<BatchPlanPreviewProps> = ({
  tasks,
  onApproveAll,
  onBack,
  isExecuting
}) => {
  // Aggregate stats
  const totalTasks = tasks.length;
  const totalCases = tasks.reduce((sum, t) => sum + (t.plan?.total_cases || 0), 0);
  const totalTimeSeconds = tasks.reduce((sum, t) => sum + (t.plan?.estimated_time_seconds || 0), 0);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) return `${hrs}h ${mins % 60}m`;
    return `${mins}m`;
  };

  const failedPlans = tasks.filter(t => t.state === 'failed');
  const allSuccessful = failedPlans.length === 0;

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={FileText}
          label="Total Sarcini"
          value={totalTasks}
          color="bg-blue-500"
        />
        <StatCard
          icon={BarChart2}
          label="Total Cazuri"
          value={totalCases}
          color="bg-green-500"
        />
        <StatCard
          icon={Clock}
          label="Timp Estimat"
          value={formatTime(totalTimeSeconds)}
          color="bg-purple-500"
        />
      </div>

      {/* Warning if failures */}
      {failedPlans.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                {failedPlans.length} planuri au eșuat la generare. Trebuie să le eliminați înainte de a continua.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Plans List (Accordion) */}
      <div className="bg-white rounded-lg border divide-y">
        {tasks.map((task, idx) => (
          <Disclosure key={task.id} defaultOpen={false}>
            {({ open }) => (
              <>
                <Disclosure.Button className="w-full flex justify-between items-center px-4 py-3 text-left text-sm font-medium hover:bg-gray-50 focus:outline-none">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 font-mono w-6">{idx + 1}.</span>
                    <div className="flex flex-col">
                      <span className="text-gray-900 truncate max-w-md">{task.query}</span>
                      <span className="text-xs text-gray-500">
                        {task.plan ? `${task.plan.total_cases} cazuri • ${Math.round(task.plan.estimated_time_seconds / 60)} min` : 'Eroare generare'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {task.state === 'failed' ? (
                      <span className="text-red-600 text-xs font-bold">EȘUAT</span>
                    ) : (
                      <span className="text-green-600 text-xs font-bold">PREGĂTIT</span>
                    )}
                    <ChevronUpIcon
                      className={`${open ? 'transform rotate-180' : ''} w-5 h-5 text-gray-500`}
                    />
                  </div>
                </Disclosure.Button>
                <Disclosure.Panel className="px-4 pt-2 pb-4 text-sm text-gray-500 bg-gray-50">
                  {task.plan ? (
                    <div className="space-y-2">
                      <p><strong>Strategie:</strong> {task.plan.strategy_summary}</p>
                      <p><strong>Căutări:</strong> {task.plan.strategies_used?.join(', ')}</p>
                      {/* Preview data logic could go here, maybe truncated */}
                    </div>
                  ) : (
                    <p className="text-red-600">{task.error || 'Unknown error'}</p>
                  )}
                </Disclosure.Panel>
              </>
            )}
          </Disclosure>
        ))}
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center pt-4 border-t">
        <button
          onClick={onBack}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Înapoi la Coadă
        </button>
        <button
          onClick={onApproveAll}
          disabled={!allSuccessful || isExecuting}
          className={`flex items-center px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white
            ${!allSuccessful || isExecuting ? 'bg-gray-400 cursor-not-allowed' : 'bg-brand-accent hover:bg-brand-accent-dark'}`}
        >
          {isExecuting ? 'Se inițializează...' : 'Aprobă Tot și Execută'}
        </button>
      </div>
    </div>
  );
};
