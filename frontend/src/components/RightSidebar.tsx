import React from 'react';
// Assuming you will create a 'contribuie.png' icon
import contribuieIcon from '@/assets/icons/justice.png'; // Placeholder

interface RightSidebarProps {
  onContribuieClick: () => void;
}

const RightSidebar: React.FC<RightSidebarProps> = ({ onContribuieClick }) => {
  return (
    <div className="fixed top-1/2 right-0 -translate-y-1/2 z-10 flex flex-col items-end">
        <button
            onClick={onContribuieClick}
            className="bg-white p-3 rounded-l-lg shadow-lg border-l border-t border-b flex items-center space-x-2 text-gray-700 hover:bg-gray-50 transition-colors"
        >
            <img src={contribuieIcon} alt="Contribuie" className="h-6 w-6" />
            <span className="[writing-mode:vertical-rl] text-sm font-semibold transform rotate-180">
                Ajutor
            </span>
        </button>
    </div>
  );
};

export default RightSidebar;
