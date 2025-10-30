import React from 'react';

interface EquivalentsHelpProps {
  onClose: () => void;
  helpText: { title: string; message: string };
}

const EquivalentsHelp: React.FC<EquivalentsHelpProps> = ({ onClose, helpText }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-white p-4 rounded">
        <h2 className="text-lg font-bold mb-2">{helpText.title}</h2>
        <pre className="whitespace-pre-wrap">{helpText.message}</pre>
        <button
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
          onClick={onClose}
        >
          Închide
        </button>
      </div>
    </div>
  );
};

export default EquivalentsHelp;
