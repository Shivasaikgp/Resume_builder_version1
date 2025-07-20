'use client';

import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { EducationItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Plus, 
  Trash2, 
  GraduationCap, 
  School, 
  MapPin, 
  Calendar,
  ChevronUp,
  ChevronDown,
  Award
} from 'lucide-react';

interface EducationFormProps {
  data: EducationItem[];
  onChange: (data: EducationItem[]) => void;
}

export function EducationForm({ data, onChange }: EducationFormProps) {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set([0]));
  
  const {
    register,
    control,
    watch,
    formState: { errors },
  } = useForm<{ education: EducationItem[] }>({
    defaultValues: {
      education: data.length > 0 ? data : [{
        degree: '',
        school: '',
        location: '',
        graduationDate: '',
        gpa: '',
        honors: [],
      }],
    },
    mode: 'onChange',
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'education',
  });

  // Watch for changes and update parent component
  const watchedValues = watch('education');
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

  const addEducation = () => {
    append({
      degree: '',
      school: '',
      location: '',
      graduationDate: '',
      gpa: '',
      honors: [],
    });
    setExpandedItems(new Set([...expandedItems, fields.length]));
  };

  const removeEducation = (index: number) => {
    remove(index);
    const newExpanded = new Set(expandedItems);
    newExpanded.delete(index);
    setExpandedItems(newExpanded);
  };

  const addHonor = (educationIndex: number) => {
    const currentEducation = watchedValues[educationIndex];
    const updatedHonors = [...(currentEducation.honors || []), ''];
    
    const updatedEducation = [...watchedValues];
    updatedEducation[educationIndex] = {
      ...currentEducation,
      honors: updatedHonors,
    };
    onChange(updatedEducation);
  };

  const removeHonor = (educationIndex: number, honorIndex: number) => {
    const currentEducation = watchedValues[educationIndex];
    const updatedHonors = (currentEducation.honors || []).filter((_, i) => i !== honorIndex);
    
    const updatedEducation = [...watchedValues];
    updatedEducation[educationIndex] = {
      ...currentEducation,
      honors: updatedHonors,
    };
    onChange(updatedEducation);
  };

  return (
    <div className="space-y-6">
      {fields.map((field, index) => {
        const isExpanded = expandedItems.has(index);
        const education = watchedValues[index];
        
        return (
          <div key={field.id} className="border border-gray-200 rounded-lg p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-gray-600" />
                <h3 className="font-medium text-gray-900">
                  {education?.degree && education?.school 
                    ? `${education.degree} - ${education.school}`
                    : `Education ${index + 1}`
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
                    onClick={() => removeEducation(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {isExpanded && (
              <div className="space-y-4">
                {/* Degree */}
                <div className="space-y-2">
                  <Label htmlFor={`education.${index}.degree`}>
                    Degree *
                  </Label>
                  <Input
                    {...register(`education.${index}.degree`, {
                      required: 'Degree is required',
                    })}
                    placeholder="Bachelor of Science in Computer Science"
                    className={errors.education?.[index]?.degree ? 'border-red-500' : ''}
                  />
                  {errors.education?.[index]?.degree && (
                    <p className="text-sm text-red-600">
                      {errors.education[index]?.degree?.message}
                    </p>
                  )}
                </div>

                {/* School */}
                <div className="space-y-2">
                  <Label htmlFor={`education.${index}.school`} className="flex items-center gap-2">
                    <School className="w-4 h-4" />
                    School/University *
                  </Label>
                  <Input
                    {...register(`education.${index}.school`, {
                      required: 'School name is required',
                    })}
                    placeholder="University of California, Berkeley"
                    className={errors.education?.[index]?.school ? 'border-red-500' : ''}
                  />
                  {errors.education?.[index]?.school && (
                    <p className="text-sm text-red-600">
                      {errors.education[index]?.school?.message}
                    </p>
                  )}
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label htmlFor={`education.${index}.location`} className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Location
                  </Label>
                  <Input
                    {...register(`education.${index}.location`)}
                    placeholder="Berkeley, CA"
                  />
                </div>

                {/* Graduation Date and GPA */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`education.${index}.graduationDate`} className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Graduation Date
                    </Label>
                    <Input
                      type="month"
                      {...register(`education.${index}.graduationDate`)}
                      placeholder="May 2023"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`education.${index}.gpa`}>
                      GPA (Optional)
                    </Label>
                    <Input
                      {...register(`education.${index}.gpa`, {
                        pattern: {
                          value: /^[0-4](\.[0-9]{1,2})?$/,
                          message: 'Please enter a valid GPA (0.0-4.0)',
                        },
                      })}
                      placeholder="3.8"
                      className={errors.education?.[index]?.gpa ? 'border-red-500' : ''}
                    />
                    {errors.education?.[index]?.gpa && (
                      <p className="text-sm text-red-600">
                        {errors.education[index]?.gpa?.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Honors & Awards */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    Honors & Awards
                  </Label>
                  <div className="space-y-2">
                    {(education?.honors || []).map((honor, honorIndex) => (
                      <div key={honorIndex} className="flex gap-2">
                        <div className="flex-1">
                          <Input
                            {...register(`education.${index}.honors.${honorIndex}`)}
                            placeholder="Dean's List, Magna Cum Laude, etc."
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeHonor(index, honorIndex)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addHonor(index)}
                      className="flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Honor/Award
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Add Education Button */}
      <Button
        type="button"
        variant="outline"
        onClick={addEducation}
        className="w-full flex items-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Add Education
      </Button>

      {/* Help Text */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h4 className="font-medium text-purple-900 mb-2">Tips for Education Section</h4>
        <ul className="text-sm text-purple-800 space-y-1">
          <li>• List your highest degree first</li>
          <li>• Include GPA only if it's 3.5 or higher</li>
          <li>• Add relevant coursework for entry-level positions</li>
          <li>• Include academic honors and awards</li>
          <li>• For recent graduates, education can go before experience</li>
        </ul>
      </div>
    </div>
  );
}