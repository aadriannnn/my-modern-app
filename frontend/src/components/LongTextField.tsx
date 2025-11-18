import React, { useState } from "react";

interface LongTextFieldProps {
  label: string;
  text: string;
}

const LongTextField: React.FC<LongTextFieldProps> = ({ label, text }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!text || typeof text !== 'string' || text.trim().toLowerCase() === 'null') {
    return null; // Don't render if text is not available
  }

  // A simple heuristic to decide if the expand button is needed
  const needsExpansion = text.length > 300;

  return (
    <div className="mb-4">
      <h4 className="font-semibold text-brand-text mb-2">{label}</h4>
      <div className="bg-gray-50 p-4 rounded-lg text-brand-text-secondary whitespace-pre-wrap text-base leading-relaxed">
        <p className={!isExpanded && needsExpansion ? "line-clamp-6" : ""}>
          {text}
        </p>
      </div>
      {needsExpansion && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-brand-accent hover:opacity-80 mt-2 text-sm font-semibold transition-opacity"
        >
          {isExpanded ? "Afișează mai puțin" : "Afișează mai mult"}
        </button>
      )}
    </div>
  );
};

export default LongTextField;
