import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { cn } from '@/lib/utils';

interface FeedbackData {
  type: 'suggestion' | 'analysis' | 'general';
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  context: {
    suggestionId?: string;
    section?: string;
    content?: string;
    timestamp: Date;
  };
}

interface FeedbackCollectorProps {
  type: 'suggestion' | 'analysis' | 'general';
  suggestionId?: string;
  section?: string;
  content?: string;
  onSubmit: (feedback: FeedbackData) => void;
  onCancel?: () => void;
  className?: string;
  compact?: boolean;
}

export function FeedbackCollector({
  type,
  suggestionId,
  section,
  content,
  onSubmit,
  onCancel,
  className,
  compact = false,
}: FeedbackCollectorProps) {
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!rating) return;

    setIsSubmitting(true);
    
    const feedback: FeedbackData = {
      type,
      rating,
      comment: comment.trim() || undefined,
      context: {
        suggestionId,
        section,
        content,
        timestamp: new Date(),
      },
    };

    try {
      await onSubmit(feedback);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRatingLabel = (value: number) => {
    switch (value) {
      case 1: return 'Poor';
      case 2: return 'Fair';
      case 3: return 'Good';
      case 4: return 'Very Good';
      case 5: return 'Excellent';
      default: return '';
    }
  };

  const getTypeLabel = () => {
    switch (type) {
      case 'suggestion': return 'How helpful was this suggestion?';
      case 'analysis': return 'How accurate was this analysis?';
      case 'general': return 'How was your experience?';
    }
  };

  if (compact) {
    return (
      <div className={cn('flex items-center space-x-2 p-2 bg-gray-50 rounded', className)}>
        <span className="text-xs text-gray-600">Rate:</span>
        <div className="flex space-x-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              onClick={() => setRating(value as 1 | 2 | 3 | 4 | 5)}
              className={cn(
                'w-6 h-6 text-sm transition-colors',
                rating && value <= rating
                  ? 'text-yellow-500'
                  : 'text-gray-300 hover:text-yellow-400'
              )}
            >
              ⭐
            </button>
          ))}
        </div>
        {rating && (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            size="sm"
            className="text-xs px-2 py-1 h-6"
          >
            {isSubmitting ? '...' : 'Send'}
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={cn('p-4', className)}>
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-900">
          {getTypeLabel()}
        </h3>

        {/* Rating Stars */}
        <div className="space-y-2">
          <div className="flex items-center space-x-1">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                onClick={() => setRating(value as 1 | 2 | 3 | 4 | 5)}
                className={cn(
                  'w-8 h-8 text-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded',
                  rating && value <= rating
                    ? 'text-yellow-500'
                    : 'text-gray-300 hover:text-yellow-400'
                )}
                title={getRatingLabel(value)}
              >
                ⭐
              </button>
            ))}
          </div>
          {rating && (
            <p className="text-xs text-gray-600">
              {getRatingLabel(rating)}
            </p>
          )}
        </div>

        {/* Comment */}
        <div className="space-y-2">
          <label className="text-xs text-gray-600">
            Additional comments (optional):
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tell us more about your experience..."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={3}
            maxLength={500}
          />
          <p className="text-xs text-gray-500">
            {comment.length}/500 characters
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-2">
          {onCancel && (
            <Button
              onClick={onCancel}
              variant="ghost"
              size="sm"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={!rating || isSubmitting}
            size="sm"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </div>
      </div>
    </Card>
  );
}

// Quick feedback buttons for inline use
interface QuickFeedbackProps {
  onFeedback: (rating: 1 | 2 | 3 | 4 | 5) => void;
  className?: string;
}

export function QuickFeedback({ onFeedback, className }: QuickFeedbackProps) {
  const [submitted, setSubmitted] = useState(false);

  const handleFeedback = (rating: 1 | 2 | 3 | 4 | 5) => {
    onFeedback(rating);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 2000);
  };

  if (submitted) {
    return (
      <div className={cn('flex items-center space-x-2 text-green-600', className)}>
        <span className="text-sm">✓ Thanks for your feedback!</span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <span className="text-xs text-gray-500">Helpful?</span>
      <button
        onClick={() => handleFeedback(5)}
        className="text-green-600 hover:text-green-700 text-sm"
        title="Yes, helpful"
      >
        👍
      </button>
      <button
        onClick={() => handleFeedback(2)}
        className="text-red-600 hover:text-red-700 text-sm"
        title="Not helpful"
      >
        👎
      </button>
    </div>
  );
}

// Feedback summary display
interface FeedbackSummaryProps {
  averageRating: number;
  totalFeedback: number;
  className?: string;
}

export function FeedbackSummary({ 
  averageRating, 
  totalFeedback, 
  className 
}: FeedbackSummaryProps) {
  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <div className="flex items-center">
        {Array(fullStars).fill(0).map((_, i) => (
          <span key={`full-${i}`} className="text-yellow-500">⭐</span>
        ))}
        {hasHalfStar && <span className="text-yellow-500">⭐</span>}
        {Array(emptyStars).fill(0).map((_, i) => (
          <span key={`empty-${i}`} className="text-gray-300">⭐</span>
        ))}
      </div>
    );
  };

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      {renderStars(averageRating)}
      <span className="text-sm text-gray-600">
        {averageRating.toFixed(1)} ({totalFeedback} {totalFeedback === 1 ? 'review' : 'reviews'})
      </span>
    </div>
  );
}