'use client';

import React, { useState } from 'react';
import { ResumeSection } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Trash2, 
  GripVertical,
  Eye,
  EyeOff,
  Edit3,
  Check,
  X,
  Briefcase,
  GraduationCap,
  Code,
  FolderOpen,
  Award,
  Settings
} from 'lucide-react';

interface SectionManagerProps {
  sections: ResumeSection[];
  onChange: (sections: ResumeSection[]) => void;
}

export function SectionManager({ sections, onChange }: SectionManagerProps) {
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const sectionIcons = {
    experience: Briefcase,
    education: GraduationCap,
    skills: Code,
    projects: FolderOpen,
    certifications: Award,
    custom: Settings,
  };

  const sectionTypes = [
    { value: 'experience', label: 'Work Experience' },
    { value: 'education', label: 'Education' },
    { value: 'skills', label: 'Skills' },
    { value: 'projects', label: 'Projects' },
    { value: 'certifications', label: 'Certifications' },
    { value: 'custom', label: 'Custom Section' },
  ];

  const toggleSectionVisibility = (index: number) => {
    const updatedSections = [...sections];
    updatedSections[index] = {
      ...updatedSections[index],
      visible: !updatedSections[index].visible,
    };
    onChange(updatedSections);
  };

  const startEditingTitle = (index: number, currentTitle: string) => {
    setEditingSection(`${index}`);
    setEditingTitle(currentTitle);
  };

  const saveTitle = (index: number) => {
    if (editingTitle.trim()) {
      const updatedSections = [...sections];
      updatedSections[index] = {
        ...updatedSections[index],
        title: editingTitle.trim(),
      };
      onChange(updatedSections);
    }
    setEditingSection(null);
    setEditingTitle('');
  };

  const cancelEditing = () => {
    setEditingSection(null);
    setEditingTitle('');
  };

  const removeSection = (index: number) => {
    const updatedSections = sections.filter((_, i) => i !== index);
    onChange(updatedSections);
  };

  const addSection = (type: string) => {
    const newSection: ResumeSection = {
      type: type as ResumeSection['type'],
      title: sectionTypes.find(t => t.value === type)?.label || 'New Section',
      items: [],
      order: sections.length + 1,
      visible: true,
    };
    onChange([...sections, newSection]);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    const updatedSections = [...sections];
    const draggedSection = updatedSections[draggedIndex];
    
    // Remove the dragged section
    updatedSections.splice(draggedIndex, 1);
    
    // Insert at new position
    updatedSections.splice(dropIndex, 0, draggedSection);
    
    // Update order values
    updatedSections.forEach((section, index) => {
      section.order = index + 1;
    });

    onChange(updatedSections);
    setDraggedIndex(null);
  };

  const availableSectionTypes = sectionTypes.filter(
    type => !sections.some(section => section.type === type.value) || type.value === 'custom'
  );

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Manage Resume Sections</h3>
        <p className="text-gray-600">
          Customize which sections appear on your resume and in what order.
        </p>
      </div>

      {/* Current Sections */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900">Current Sections</h4>
        {sections.map((section, index) => {
          const IconComponent = sectionIcons[section.type] || Settings;
          const isEditing = editingSection === `${index}`;
          
          return (
            <div
              key={`${section.type}-${index}`}
              className={`border border-gray-200 rounded-lg p-4 transition-all ${
                draggedIndex === index ? 'opacity-50' : ''
              } ${section.visible ? 'bg-white' : 'bg-gray-50'}`}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Drag Handle */}
                  <div className="cursor-move text-gray-400 hover:text-gray-600">
                    <GripVertical className="w-5 h-5" />
                  </div>

                  {/* Section Icon */}
                  <IconComponent className="w-5 h-5 text-gray-600" />

                  {/* Section Title */}
                  <div className="flex-1">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              saveTitle(index);
                            } else if (e.key === 'Escape') {
                              cancelEditing();
                            }
                          }}
                          className="text-sm"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          onClick={() => saveTitle(index)}
                          className="p-1 h-8 w-8"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={cancelEditing}
                          className="p-1 h-8 w-8"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <h5 className="font-medium text-gray-900">{section.title}</h5>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startEditingTitle(index, section.title)}
                          className="p-1 h-6 w-6 opacity-0 group-hover:opacity-100"
                        >
                          <Edit3 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                    <p className="text-sm text-gray-500">
                      {section.items?.length || 0} items • {section.type}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {/* Visibility Toggle */}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleSectionVisibility(index)}
                    className={`p-2 ${
                      section.visible 
                        ? 'text-green-600 hover:text-green-700' 
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {section.visible ? (
                      <Eye className="w-4 h-4" />
                    ) : (
                      <EyeOff className="w-4 h-4" />
                    )}
                  </Button>

                  {/* Remove Section */}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeSection(index)}
                    className="p-2 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add New Section */}
      {availableSectionTypes.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Add New Section</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {availableSectionTypes.map((sectionType) => {
              const IconComponent = sectionIcons[sectionType.value as keyof typeof sectionIcons] || Settings;
              
              return (
                <Button
                  key={sectionType.value}
                  variant="outline"
                  onClick={() => addSection(sectionType.value)}
                  className="flex items-center gap-2 justify-start p-4 h-auto"
                >
                  <IconComponent className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-medium">{sectionType.label}</div>
                    <div className="text-xs text-gray-500">
                      {sectionType.value === 'custom' ? 'Create your own section' : `Add ${sectionType.label.toLowerCase()}`}
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {/* Section Management Tips */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-medium text-yellow-900 mb-2">Section Management Tips</h4>
        <ul className="text-sm text-yellow-800 space-y-1">
          <li>• Drag sections to reorder them on your resume</li>
          <li>• Use the eye icon to show/hide sections without deleting them</li>
          <li>• Click the edit icon to rename section titles</li>
          <li>• Standard order: Experience → Education → Skills → Projects</li>
          <li>• For new graduates: Education → Experience → Skills → Projects</li>
        </ul>
      </div>

      {/* Section Statistics */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Section Overview</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">{sections.length}</div>
            <div className="text-sm text-gray-600">Total Sections</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {sections.filter(s => s.visible).length}
            </div>
            <div className="text-sm text-gray-600">Visible</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600">
              {sections.filter(s => !s.visible).length}
            </div>
            <div className="text-sm text-gray-600">Hidden</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">
              {sections.reduce((total, section) => total + (section.items?.length || 0), 0)}
            </div>
            <div className="text-sm text-gray-600">Total Items</div>
          </div>
        </div>
      </div>
    </div>
  );
}