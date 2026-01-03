import React from 'react';

interface AIResultBadgeProps {
    className?: string;
    score?: number;
}

const AIResultBadge: React.FC<AIResultBadgeProps> = ({ className = '' }) => {
    return (
        <div className={`ai-result-badge ${className}`}>
            <svg
                className="ai-badge-icon"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path
                    d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                    fill="currentColor"
                />
            </svg>
            <span className="ai-badge-text">Rezultat AI</span>
        </div>
    );
};

export default AIResultBadge;
