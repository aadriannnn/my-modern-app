import React, { useState } from "react";

interface LongTextFieldProps {
  label: string;
  text: string;
}

const LongTextField: React.FC<LongTextFieldProps> = ({ label, text }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!text) {
    return (
        <div className="mb-4">
            <h4 className="font-semibold text-gray-700 mb-1">{label}</h4>
            <div className="bg-gray-50 p-3 rounded-md text-gray-500 italic">
                Nu sunt informații.
            </div>
        </div>
    );
  }

  const toggleExpansion = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="mb-4">
      <h4 className="font-semibold text-gray-700 mb-1">{label}</h4>
      <div
        className={`bg-gray-50 p-3 rounded-md text-gray-800 whitespace-pre-wrap transition-all duration-300 ease-in-out ${
          isExpanded ? "" : "line-clamp-4"
        }`}
      >
        {text}
      </div>
      <button
        onClick={toggleExpansion}
        className="text-blue-600 hover:underline mt-2 text-sm font-medium focus:outline-none"
      >
        {isExpanded ? "Citește mai puțin" : "Citește mai mult"}
      </button>
    </div>
  );
};

export default LongTextField;
