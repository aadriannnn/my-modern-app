import React, { useState } from "react";

interface LongTextFieldProps {
  label: string;
  text: string;
  highlightTerms?: string[];
}

const LongTextField: React.FC<LongTextFieldProps> = ({ label, text, highlightTerms }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Check if text is empty or invalid
  const hasNoContent = !text || typeof text !== 'string' || text.trim().toLowerCase() === 'null' || text.trim() === '';

  // If no content, show a helpful message instead of returning null
  if (hasNoContent) {
    return (
      <div className="mb-4">
        <h4 className="font-semibold text-brand-text mb-2">{label}</h4>
        <div className="bg-gray-50 p-4 rounded-lg text-gray-500 italic text-base leading-relaxed border border-gray-200">
          <p>Această informație nu este disponibilă pentru acest caz.</p>
        </div>
      </div>
    );
  }

  // A simple heuristic to decide if the expand button is needed
  const needsExpansion = text.length > 300;

  const renderContent = () => {
    if (!highlightTerms || highlightTerms.length === 0) {
      return text;
    }

    // Escape terms for use in regex
    const escapedTerms = highlightTerms.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    // Sort by length descending to match longer phrases first (if any)
    escapedTerms.sort((a, b) => b.length - a.length);

    if (escapedTerms.length === 0) return text;

    // Create a regex that matches any of the terms, case-insensitive, globally
    // We use word boundaries \b to avoid partial matches if that's desired,
    // BUT the backend search logic uses \y (postgres word boundary).
    // Let's use word boundaries here too to be consistent with "professional marking".
    // \b in JS regex works for ascii, but might struggle with unicode.
    // However, given the requirement "similar words", simply highlighting the exact match found
    // (which includes normalized variants) is safest.
    // The backend sends 'scoala' and 'școală'.

    // Using simple replacement without boundary checks might highlight 'scoala' in 'portocala' if not careful.
    // Ideally we use a boundary check.
    // Since JS \b handles some unicode, but not all, we'll try a flexible approach.
    // If the backend search was strict about boundaries, we should be too.

    const pattern = new RegExp(`(${escapedTerms.join('|')})`, 'gi');

    const parts = text.split(pattern);
    return parts.map((part, index) => {
        // Check if this part matches one of our terms (case insensitive)
        // We use the same regex to test validity
        if (pattern.test(part)) {
            // Check if it's a full word match?
            // The split method splits BY the match. So 'part' IS the match.
            // But 'split' splits by the regex.
            return (
                <mark key={index} className="bg-brand-accent/30 text-brand-dark font-medium rounded px-0.5 mx-0.5">
                    {part}
                </mark>
            );
        }
        return part;
    });
  };

  return (
    <div className="mb-4">
      <h4 className="font-semibold text-brand-text mb-2">{label}</h4>
      <div className="bg-gray-50 p-4 rounded-lg text-brand-text-secondary whitespace-pre-wrap text-base leading-relaxed">
        <p className={!isExpanded && needsExpansion ? "line-clamp-6" : ""}>
          {renderContent()}
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
