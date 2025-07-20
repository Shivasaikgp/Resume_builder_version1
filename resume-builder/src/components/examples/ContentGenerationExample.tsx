// Example component demonstrating ContentGenerationAgent usage
'use client';

import React, { useState } from 'react';
import { useContentGeneration } from '../../hooks/useContentGeneration';
import { ContentSuggestions } from '../ai/ContentSuggestions';
import { UserContext, ContentSuggestion } from '../../types';

const exampleUserContext: UserContext = {
  profile: {
    industry: 'Technology',
    experienceLevel: 'mid',
    targetRoles: ['Software Engineer', 'Full Stack Developer'],
    skills: ['JavaScript', 'React', 'Node.js', 'Python'],
    careerGoals: ['Technical Leadership', 'Product Development']
  },
  preferences: {
    writingStyle: 'formal',
    contentLength: 'detailed',
    focusAreas: ['technical skills', 'leadership', 'problem solving']
  },
  history: {
    interactions: [],
    feedbackPatterns: [],
    improvementAreas: ['quantifying achievements', 'action verbs']
  }
};

export function ContentGenerationExample() {
  const [currentContent, setCurrentContent] = useState('');
  const [selectedSection, setSelectedSection] = useState('experience');
  const [enhancedContent, setEnhancedContent] = useState('');
  const [bulletPoints, setBulletPoints] = useState<string[]>([]);
  const [actionVerbs, setActionVerbs] = useState<ContentSuggestion[]>([]);

  const {
    isLoading,
    error,
    enhanceContent,
    generateBulletPoints,
    getActionVerbs,
    clearError
  } = useContentGeneration();

  const handleEnhanceContent = async () => {
    if (!currentContent.trim()) return;

    try {
      const enhanced = await enhanceContent({
        content: currentContent,
        section: selectedSection as 'experience' | 'skills' | 'summary' | 'achievements',
        context: exampleUserContext
      });
      setEnhancedContent(enhanced);
    } catch (err) {
      console.error('Enhancement failed:', err);
    }
  };

  const handleGenerateBulletPoints = async () => {
    try {
      const points = await generateBulletPoints(
        'Software Engineer',
        'Google',
        'mid',
        'Technology'
      );
      setBulletPoints(points);
    } catch (err) {
      console.error('Bullet point generation failed:', err);
    }
  };

  const handleGetActionVerbs = async () => {
    try {
      const verbs = await getActionVerbs(
        currentContent,
        exampleUserContext,
        6
      );
      setActionVerbs(verbs);
    } catch (err) {
      console.error('Action verb suggestions failed:', err);
    }
  };

  const handleSuggestionSelect = (suggestion: ContentSuggestion) => {
    // In a real app, you might insert the suggestion into the current content
    console.log('Selected suggestion:', suggestion);
    alert(`Selected: ${suggestion.content}`);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Content Generation Agent Demo
        </h1>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center justify-between">
              <p className="text-sm text-red-700">{error}</p>
              <button
                onClick={clearError}
                className="text-red-700 hover:text-red-900"
              >
                ×
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Content Input Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">
              Content Input
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resume Section
              </label>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="experience">Experience</option>
                <option value="skills">Skills</option>
                <option value="summary">Summary</option>
                <option value="achievements">Achievements</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Content
              </label>
              <textarea
                value={currentContent}
                onChange={(e) => setCurrentContent(e.target.value)}
                placeholder="Enter your current resume content here..."
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleEnhanceContent}
                disabled={isLoading || !currentContent.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Enhancing...' : 'Enhance Content'}
              </button>

              <button
                onClick={handleGenerateBulletPoints}
                disabled={isLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Generating...' : 'Generate Bullet Points'}
              </button>

              <button
                onClick={handleGetActionVerbs}
                disabled={isLoading}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Loading...' : 'Get Action Verbs'}
              </button>
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-800">
              AI-Generated Results
            </h2>

            {enhancedContent && (
              <div>
                <h3 className="text-md font-medium text-gray-700 mb-2">
                  Enhanced Content
                </h3>
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-gray-800">{enhancedContent}</p>
                </div>
              </div>
            )}

            {bulletPoints.length > 0 && (
              <div>
                <h3 className="text-md font-medium text-gray-700 mb-2">
                  Generated Bullet Points
                </h3>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <ul className="list-disc list-inside space-y-1">
                    {bulletPoints.map((point, index) => (
                      <li key={index} className="text-sm text-gray-800">
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {actionVerbs.length > 0 && (
              <div>
                <h3 className="text-md font-medium text-gray-700 mb-2">
                  Action Verb Suggestions
                </h3>
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-md">
                  <div className="flex flex-wrap gap-2">
                    {actionVerbs.map((verb) => (
                      <span
                        key={verb.id}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 cursor-pointer hover:bg-purple-200"
                        onClick={() => handleSuggestionSelect(verb)}
                        title={verb.context}
                      >
                        {verb.content}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Suggestions Component */}
      <ContentSuggestions
        context={exampleUserContext}
        section={selectedSection}
        currentContent={currentContent}
        onSuggestionSelect={handleSuggestionSelect}
        className="shadow-lg"
      />

      {/* User Context Display */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Current User Context
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <h3 className="font-medium text-gray-700 mb-2">Profile</h3>
            <ul className="space-y-1 text-gray-600">
              <li>Industry: {exampleUserContext.profile?.industry}</li>
              <li>Level: {exampleUserContext.profile?.experienceLevel}</li>
              <li>Roles: {exampleUserContext.profile?.targetRoles?.join(', ')}</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-gray-700 mb-2">Preferences</h3>
            <ul className="space-y-1 text-gray-600">
              <li>Style: {exampleUserContext.preferences?.writingStyle}</li>
              <li>Length: {exampleUserContext.preferences?.contentLength}</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-gray-700 mb-2">Skills</h3>
            <div className="flex flex-wrap gap-1">
              {exampleUserContext.profile?.skills?.map((skill, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-200 text-gray-700"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}