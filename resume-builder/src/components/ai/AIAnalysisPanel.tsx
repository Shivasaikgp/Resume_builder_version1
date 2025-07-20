import React from 'react';

interface AIAnalysisPanelProps {
  analysis?: {
    score: number;
    breakdown: Record<string, number>;
    suggestions: Array<{
      type: string;
      message: string;
      priority?: string;
    }>;
  };
}

export const AIAnalysisPanel: React.FC<AIAnalysisPanelProps> = ({ analysis }) => {
  return (
    <div data-testid="analysis-panel" role="region" aria-label="AI Analysis Panel">
      <div data-testid="score-container" aria-live="polite">
        <div 
          data-testid="resume-score" 
          role="progressbar"
          aria-valuenow={analysis?.score || 0}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Resume score: ${analysis?.score || 0} out of 100`}
        >
          Score: {analysis?.score || 0}
        </div>
      </div>
      
      <div>
        <h3>Breakdown</h3>
        {analysis?.breakdown && Object.entries(analysis.breakdown).map(([key, value]) => (
          <div key={key}>
            <label>{key.replace('_', ' ')}</label>
            <div 
              role="progressbar"
              aria-valuenow={value}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${key}: ${value} out of 100`}
            >
              {value}
            </div>
          </div>
        ))}
      </div>
      
      <div>
        <h3>Suggestions</h3>
        <ul role="list" aria-label="Improvement suggestions">
          {analysis?.suggestions?.map((suggestion, index) => (
            <li 
              key={index} 
              role="listitem"
              aria-label={`${suggestion.priority || 'medium'} priority suggestion`}
            >
              <span>{suggestion.message}</span>
              <button data-testid="apply-suggestion">Apply</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};