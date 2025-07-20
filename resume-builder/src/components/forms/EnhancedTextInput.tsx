// Enhanced text input with real-time AI suggestions
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { RealTimeEnhancement } from '../ai/RealTimeEnhancement';
import { UserContext } from '../../types';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { 
  SparklesIcon, 
  EyeIcon, 
  EyeSlashIcon 
} from '@heroicons/react/24/outline';

interface EnhancedTextInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  section: string;
  context: UserContext;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  showAIEnhancement?: boolean;
  onAIToggle?: (enabled: boolean) => void;
}

export function EnhancedTextInput({
  label,
  value,
  onChange,
  section,
  context,
  placeholder,
  multiline = false,
  rows = 3,
  disabled = false,
  required = false,
  className = '',
  showAIEnhancement = true,
  onAIToggle
}: EnhancedTextInputProps) {
  const [aiEnabled, setAIEnabled] = useState(showAIEnhancement);
  const [isFocused, setIsFocused] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  const handleToggleAI = () => {
    const newState = !aiEnabled;
    setAIEnabled(newState);
    if (onAIToggle) {
      onAIToggle(newState);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    if (!hasInteracted && newValue.length > 0) {
      setHasInteracted(true);
    }
  };

  const handleSuggestionApplied = (originalContent: string, newContent: string) => {
    onChange(newContent);
    
    // Focus back to input after applying suggestion
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        // Move cursor to end
        const length = newContent.length;
        if ('setSelectionRange' in inputRef.current) {
          inputRef.current.setSelectionRange(length, length);
        }
      }
    }, 100);
  };

  const InputComponent = multiline ? 'textarea' : 'input';

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Input Field */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor={`input-${section}`} className="text-sm font-medium text-gray-700">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          
          {showAIEnhancement && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleToggleAI}
              className={`text-xs ${aiEnabled ? 'text-blue-600' : 'text-gray-400'}`}
            >
              {aiEnabled ? (
                <>
                  <SparklesIcon className="h-3 w-3 mr-1" />
                  AI On
                </>
              ) : (
                <>
                  <EyeSlashIcon className="h-3 w-3 mr-1" />
                  AI Off
                </>
              )}
            </Button>
          )}
        </div>

        <div className="relative">
          <InputComponent
            ref={inputRef as any}
            id={`input-${section}`}
            value={value}
            onChange={handleInputChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            rows={multiline ? rows : undefined}
            className={`
              w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm
              focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              disabled:bg-gray-50 disabled:text-gray-500
              ${multiline ? 'resize-vertical min-h-[80px]' : ''}
              ${isFocused && aiEnabled ? 'ring-2 ring-blue-200' : ''}
              transition-all duration-200
            `}
          />
          
          {/* AI Enhancement Indicator */}
          {aiEnabled && hasInteracted && value.length > 10 && (
            <div className="absolute top-2 right-2">
              <SparklesIcon className="h-4 w-4 text-blue-400 animate-pulse" />
            </div>
          )}
        </div>

        {/* Character Count */}
        {value.length > 0 && (
          <div className="flex justify-between text-xs text-gray-500">
            <span>{value.length} characters</span>
            {multiline && (
              <span>{value.split(' ').filter(word => word.length > 0).length} words</span>
            )}
          </div>
        )}
      </div>

      {/* Real-time AI Enhancement */}
      {aiEnabled && hasInteracted && value.length > 5 && (
        <RealTimeEnhancement
          content={value}
          section={section}
          context={context}
          onContentChange={onChange}
          onSuggestionApplied={handleSuggestionApplied}
          disabled={disabled}
          className="border-t pt-3"
        />
      )}

      {/* Quick Tips */}
      {isFocused && !hasInteracted && (
        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
          💡 Start typing to get real-time AI suggestions and improvements
        </div>
      )}
    </div>
  );
}