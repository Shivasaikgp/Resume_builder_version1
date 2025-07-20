'use client';

import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { SkillsItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Plus, 
  Trash2, 
  Code, 
  ChevronUp,
  ChevronDown,
  Tag,
  X
} from 'lucide-react';

interface SkillsFormProps {
  data: SkillsItem[];
  onChange: (data: SkillsItem[]) => void;
}

export function SkillsForm({ data, onChange }: SkillsFormProps) {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set([0]));
  const [newSkillInputs, setNewSkillInputs] = useState<Record<number, string>>({});
  
  const {
    register,
    control,
    watch,
    formState: { errors },
  } = useForm<{ skillCategories: SkillsItem[] }>({
    defaultValues: {
      skillCategories: data.length > 0 ? data : [{
        category: 'Technical Skills',
        skills: [],
      }],
    },
    mode: 'onChange',
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'skillCategories',
  });

  // Watch for changes and update parent component
  const watchedValues = watch('skillCategories');
  React.useEffect(() => {
    onChange(watchedValues);
  }, [watchedValues, onChange]);

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  const addSkillCategory = () => {
    append({
      category: '',
      skills: [],
    });
    setExpandedItems(new Set([...expandedItems, fields.length]));
  };

  const removeSkillCategory = (index: number) => {
    remove(index);
    const newExpanded = new Set(expandedItems);
    newExpanded.delete(index);
    setExpandedItems(newExpanded);
  };

  const addSkill = (categoryIndex: number) => {
    const skillText = newSkillInputs[categoryIndex]?.trim();
    if (!skillText) return;

    const currentCategory = watchedValues[categoryIndex];
    const updatedSkills = [...(currentCategory.skills || []), skillText];
    
    const updatedCategories = [...watchedValues];
    updatedCategories[categoryIndex] = {
      ...currentCategory,
      skills: updatedSkills,
    };
    onChange(updatedCategories);

    // Clear the input
    setNewSkillInputs(prev => ({ ...prev, [categoryIndex]: '' }));
  };

  const removeSkill = (categoryIndex: number, skillIndex: number) => {
    const currentCategory = watchedValues[categoryIndex];
    const updatedSkills = (currentCategory.skills || []).filter((_, i) => i !== skillIndex);
    
    const updatedCategories = [...watchedValues];
    updatedCategories[categoryIndex] = {
      ...currentCategory,
      skills: updatedSkills,
    };
    onChange(updatedCategories);
  };

  const handleSkillInputChange = (categoryIndex: number, value: string) => {
    setNewSkillInputs(prev => ({ ...prev, [categoryIndex]: value }));
  };

  const handleSkillInputKeyPress = (categoryIndex: number, e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSkill(categoryIndex);
    }
  };

  // Predefined skill suggestions
  const skillSuggestions = {
    'Technical Skills': [
      'JavaScript', 'Python', 'React', 'Node.js', 'TypeScript', 'Java', 'C++', 'SQL',
      'AWS', 'Docker', 'Kubernetes', 'Git', 'MongoDB', 'PostgreSQL'
    ],
    'Soft Skills': [
      'Leadership', 'Communication', 'Problem Solving', 'Team Collaboration',
      'Project Management', 'Critical Thinking', 'Adaptability', 'Time Management'
    ],
    'Languages': [
      'English (Native)', 'Spanish (Fluent)', 'French (Conversational)',
      'Mandarin (Basic)', 'German (Intermediate)'
    ],
    'Tools & Software': [
      'Microsoft Office', 'Google Workspace', 'Slack', 'Jira', 'Figma',
      'Adobe Creative Suite', 'Salesforce', 'Tableau'
    ]
  };

  return (
    <div className="space-y-6">
      {fields.map((field, index) => {
        const isExpanded = expandedItems.has(index);
        const category = watchedValues[index];
        
        return (
          <div key={field.id} className="border border-gray-200 rounded-lg p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-gray-600" />
                <h3 className="font-medium text-gray-900">
                  {category?.category || `Skill Category ${index + 1}`}
                </h3>
                {category?.skills && category.skills.length > 0 && (
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    {category.skills.length} skills
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleExpanded(index)}
                >
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSkillCategory(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {isExpanded && (
              <div className="space-y-4">
                {/* Category Name */}
                <div className="space-y-2">
                  <Label htmlFor={`skillCategories.${index}.category`}>
                    Category Name *
                  </Label>
                  <Input
                    {...register(`skillCategories.${index}.category`, {
                      required: 'Category name is required',
                    })}
                    placeholder="Technical Skills, Soft Skills, Languages, etc."
                    className={errors.skillCategories?.[index]?.category ? 'border-red-500' : ''}
                  />
                  {errors.skillCategories?.[index]?.category && (
                    <p className="text-sm text-red-600">
                      {errors.skillCategories[index]?.category?.message}
                    </p>
                  )}
                </div>

                {/* Skills */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Skills
                  </Label>
                  
                  {/* Current Skills */}
                  {category?.skills && category.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {category.skills.map((skill, skillIndex) => (
                        <div
                          key={skillIndex}
                          className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                        >
                          {skill}
                          <button
                            type="button"
                            onClick={() => removeSkill(index, skillIndex)}
                            className="hover:bg-blue-200 rounded-full p-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add New Skill */}
                  <div className="flex gap-2">
                    <Input
                      value={newSkillInputs[index] || ''}
                      onChange={(e) => handleSkillInputChange(index, e.target.value)}
                      onKeyPress={(e) => handleSkillInputKeyPress(index, e)}
                      placeholder="Type a skill and press Enter"
                    />
                    <Button
                      type="button"
                      onClick={() => addSkill(index)}
                      disabled={!newSkillInputs[index]?.trim()}
                      className="flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </Button>
                  </div>

                  {/* Skill Suggestions */}
                  {category?.category && skillSuggestions[category.category as keyof typeof skillSuggestions] && (
                    <div className="mt-3">
                      <p className="text-sm text-gray-600 mb-2">Suggestions:</p>
                      <div className="flex flex-wrap gap-2">
                        {skillSuggestions[category.category as keyof typeof skillSuggestions]
                          .filter(suggestion => !category.skills?.includes(suggestion))
                          .slice(0, 8)
                          .map((suggestion) => (
                            <button
                              key={suggestion}
                              type="button"
                              onClick={() => {
                                const updatedCategories = [...watchedValues];
                                updatedCategories[index] = {
                                  ...category,
                                  skills: [...(category.skills || []), suggestion],
                                };
                                onChange(updatedCategories);
                              }}
                              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded text-sm transition-colors"
                            >
                              + {suggestion}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Add Skill Category Button */}
      <Button
        type="button"
        variant="outline"
        onClick={addSkillCategory}
        className="w-full flex items-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Add Skill Category
      </Button>

      {/* Help Text */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
        <h4 className="font-medium text-indigo-900 mb-2">Tips for Skills Section</h4>
        <ul className="text-sm text-indigo-800 space-y-1">
          <li>• Group skills into relevant categories (Technical, Soft Skills, Languages)</li>
          <li>• List skills most relevant to your target job first</li>
          <li>• Be honest about your skill level</li>
          <li>• Include both hard and soft skills</li>
          <li>• Use industry-standard terminology</li>
          <li>• Consider adding proficiency levels for languages</li>
        </ul>
      </div>
    </div>
  );
}