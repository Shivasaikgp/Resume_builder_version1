'use client';

import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { ExperienceItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Plus, 
  Trash2, 
  Briefcase, 
  Building, 
  MapPin, 
  Calendar,
  ChevronUp,
  ChevronDown,
  Lightbulb
} from 'lucide-react';

interface ExperienceFormProps {
  data: ExperienceItem[];
  onChange: (data: ExperienceItem[]) => void;
}

export function ExperienceForm({ data, onChange }: ExperienceFormProps) {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set([0]));
  
  const {
    register,
    control,
    watch,
    formState: { errors },
  } = useForm<{ experiences: ExperienceItem[] }>({
    defaultValues: {
      experiences: data.length > 0 ? data : [{
        title: '',
        company: '',
        location: '',
        startDate: '',
        endDate: '',
        current: false,
        description: [''],
      }],
    },
    mode: 'onChange',
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'experiences',
  });

  // Watch for changes and update parent component
  const watchedValues = watch('experiences');
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

  const addExperience = () => {
    append({
      title: '',
      company: '',
      location: '',
      startDate: '',
      endDate: '',
      current: false,
      description: [''],
    });
    setExpandedItems(new Set([...expandedItems, fields.length]));
  };

  const removeExperience = (index: number) => {
    remove(index);
    const newExpanded = new Set(expandedItems);
    newExpanded.delete(index);
    setExpandedItems(newExpanded);
  };

  const addBulletPoint = (experienceIndex: number) => {
    const currentExperience = watchedValues[experienceIndex];
    const updatedDescription = [...(currentExperience.description || []), ''];
    
    // Update the form data
    const updatedExperiences = [...watchedValues];
    updatedExperiences[experienceIndex] = {
      ...currentExperience,
      description: updatedDescription,
    };
    onChange(updatedExperiences);
  };

  const removeBulletPoint = (experienceIndex: number, bulletIndex: number) => {
    const currentExperience = watchedValues[experienceIndex];
    const updatedDescription = (currentExperience.description || []).filter((_, i) => i !== bulletIndex);
    
    const updatedExperiences = [...watchedValues];
    updatedExperiences[experienceIndex] = {
      ...currentExperience,
      description: updatedDescription,
    };
    onChange(updatedExperiences);
  };

  return (
    <div className="space-y-6">
      {fields.map((field, index) => {
        const isExpanded = expandedItems.has(index);
        const experience = watchedValues[index];
        
        return (
          <div key={field.id} className="border border-gray-200 rounded-lg p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-gray-600" />
                <h3 className="font-medium text-gray-900">
                  {experience?.title && experience?.company 
                    ? `${experience.title} at ${experience.company}`
                    : `Experience ${index + 1}`
                  }
                </h3>
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
                    onClick={() => removeExperience(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {isExpanded && (
              <div className="space-y-4">
                {/* Job Title */}
                <div className="space-y-2">
                  <Label htmlFor={`experiences.${index}.title`}>
                    Job Title *
                  </Label>
                  <Input
                    {...register(`experiences.${index}.title`, {
                      required: 'Job title is required',
                    })}
                    placeholder="Software Engineer"
                    className={errors.experiences?.[index]?.title ? 'border-red-500' : ''}
                  />
                  {errors.experiences?.[index]?.title && (
                    <p className="text-sm text-red-600">
                      {errors.experiences[index]?.title?.message}
                    </p>
                  )}
                </div>

                {/* Company */}
                <div className="space-y-2">
                  <Label htmlFor={`experiences.${index}.company`} className="flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    Company *
                  </Label>
                  <Input
                    {...register(`experiences.${index}.company`, {
                      required: 'Company name is required',
                    })}
                    placeholder="Tech Corp Inc."
                    className={errors.experiences?.[index]?.company ? 'border-red-500' : ''}
                  />
                  {errors.experiences?.[index]?.company && (
                    <p className="text-sm text-red-600">
                      {errors.experiences[index]?.company?.message}
                    </p>
                  )}
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label htmlFor={`experiences.${index}.location`} className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Location
                  </Label>
                  <Input
                    {...register(`experiences.${index}.location`)}
                    placeholder="San Francisco, CA"
                  />
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`experiences.${index}.startDate`} className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Start Date *
                    </Label>
                    <Input
                      type="month"
                      {...register(`experiences.${index}.startDate`, {
                        required: 'Start date is required',
                      })}
                      className={errors.experiences?.[index]?.startDate ? 'border-red-500' : ''}
                    />
                    {errors.experiences?.[index]?.startDate && (
                      <p className="text-sm text-red-600">
                        {errors.experiences[index]?.startDate?.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`experiences.${index}.endDate`}>
                      End Date
                    </Label>
                    <Input
                      type="month"
                      {...register(`experiences.${index}.endDate`)}
                      disabled={experience?.current}
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`experiences.${index}.current`}
                        {...register(`experiences.${index}.current`)}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor={`experiences.${index}.current`} className="text-sm">
                        I currently work here
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Description/Achievements */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" />
                    Key Achievements & Responsibilities
                  </Label>
                  <div className="space-y-2">
                    {(experience?.description || ['']).map((bullet, bulletIndex) => (
                      <div key={bulletIndex} className="flex gap-2">
                        <div className="flex-1">
                          <Input
                            {...register(`experiences.${index}.description.${bulletIndex}`)}
                            placeholder="• Increased team productivity by 25% through implementation of agile methodologies"
                          />
                        </div>
                        {(experience?.description || []).length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeBulletPoint(index, bulletIndex)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addBulletPoint(index)}
                      className="flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Achievement
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Add Experience Button */}
      <Button
        type="button"
        variant="outline"
        onClick={addExperience}
        className="w-full flex items-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Add Experience
      </Button>

      {/* Help Text */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="font-medium text-green-900 mb-2">Tips for Work Experience</h4>
        <ul className="text-sm text-green-800 space-y-1">
          <li>• Start each bullet point with an action verb (Led, Developed, Managed)</li>
          <li>• Include quantifiable achievements (increased sales by 20%)</li>
          <li>• Focus on results and impact, not just responsibilities</li>
          <li>• Use keywords relevant to your target job</li>
          <li>• Keep descriptions concise but impactful</li>
        </ul>
      </div>
    </div>
  );
}