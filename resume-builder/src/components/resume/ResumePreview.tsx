'use client';

import React from 'react';
import { ResumeData, ExperienceItem, EducationItem, SkillsItem, ProjectItem } from '@/types';
import { Mail, Phone, MapPin, Linkedin, Github, Globe } from 'lucide-react';

interface ResumePreviewProps {
  data: ResumeData;
}

export function ResumePreview({ data }: ResumePreviewProps) {
  const renderExperienceItem = (item: ExperienceItem, index: number) => (
    <div key={index} className="mb-4">
      <div className="flex justify-between items-start mb-1">
        <div>
          <h4 className="font-semibold text-gray-900">{item.title}</h4>
          <p className="text-gray-700">{item.company}</p>
        </div>
        <div className="text-right text-sm text-gray-600">
          <p>{item.location}</p>
          <p>
            {item.startDate} - {item.current ? 'Present' : item.endDate || 'Present'}
          </p>
        </div>
      </div>
      {item.description && item.description.length > 0 && (
        <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 mt-2">
          {item.description.filter(desc => desc.trim()).map((desc, i) => (
            <li key={i}>{desc}</li>
          ))}
        </ul>
      )}
    </div>
  );

  const renderEducationItem = (item: EducationItem, index: number) => (
    <div key={index} className="mb-4">
      <div className="flex justify-between items-start mb-1">
        <div>
          <h4 className="font-semibold text-gray-900">{item.degree}</h4>
          <p className="text-gray-700">{item.school}</p>
        </div>
        <div className="text-right text-sm text-gray-600">
          <p>{item.location}</p>
          <p>{item.graduationDate}</p>
        </div>
      </div>
      <div className="flex gap-4 text-sm text-gray-600">
        {item.gpa && <span>GPA: {item.gpa}</span>}
      </div>
      {item.honors && item.honors.length > 0 && (
        <div className="mt-2">
          <p className="text-sm text-gray-700">
            <strong>Honors:</strong> {item.honors.join(', ')}
          </p>
        </div>
      )}
    </div>
  );

  const renderSkillsItem = (item: SkillsItem, index: number) => (
    <div key={index} className="mb-3">
      <h4 className="font-semibold text-gray-900 mb-1">{item.category}</h4>
      <div className="flex flex-wrap gap-2">
        {item.skills.map((skill, i) => (
          <span
            key={i}
            className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm"
          >
            {skill}
          </span>
        ))}
      </div>
    </div>
  );

  const renderProjectItem = (item: ProjectItem, index: number) => (
    <div key={index} className="mb-4">
      <div className="flex justify-between items-start mb-1">
        <div>
          <h4 className="font-semibold text-gray-900">{item.name}</h4>
          {item.description && (
            <p className="text-gray-700 text-sm mt-1">{item.description}</p>
          )}
        </div>
        <div className="text-right text-sm text-gray-600">
          {item.startDate && (
            <p>
              {item.startDate} - {item.endDate || 'Present'}
            </p>
          )}
        </div>
      </div>
      {item.technologies && item.technologies.length > 0 && (
        <div className="mt-2">
          <p className="text-sm text-gray-600">
            <strong>Technologies:</strong> {item.technologies.join(', ')}
          </p>
        </div>
      )}
      <div className="flex gap-4 mt-2 text-sm">
        {item.url && (
          <a href={item.url} className="text-blue-600 hover:underline">
            Live Demo
          </a>
        )}
        {item.github && (
          <a href={item.github} className="text-blue-600 hover:underline">
            GitHub
          </a>
        )}
      </div>
    </div>
  );

  const renderSectionItems = (section: any) => {
    switch (section.type) {
      case 'experience':
        return section.items.map((item: ExperienceItem, index: number) =>
          renderExperienceItem(item, index)
        );
      case 'education':
        return section.items.map((item: EducationItem, index: number) =>
          renderEducationItem(item, index)
        );
      case 'skills':
        return section.items.map((item: SkillsItem, index: number) =>
          renderSkillsItem(item, index)
        );
      case 'projects':
        return section.items.map((item: ProjectItem, index: number) =>
          renderProjectItem(item, index)
        );
      default:
        return section.items.map((item: any, index: number) => (
          <div key={index} className="mb-2 text-sm text-gray-700">
            {typeof item === 'string' ? item : JSON.stringify(item)}
          </div>
        ));
    }
  };

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 border-b">
        <h3 className="font-medium text-gray-900">Resume Preview</h3>
        <p className="text-sm text-gray-600">Live preview of your resume</p>
      </div>

      {/* Resume Content */}
      <div className="p-8 max-h-[800px] overflow-y-auto">
        <div className="space-y-6">
          {/* Personal Information */}
          <div className="text-center border-b pb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              {data.personalInfo.fullName || 'Your Name'}
            </h1>
            
            {/* Contact Info */}
            <div className="flex flex-wrap justify-center gap-4 mb-3 text-sm text-gray-600">
              {data.personalInfo.email && (
                <div className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  <span>{data.personalInfo.email}</span>
                </div>
              )}
              {data.personalInfo.phone && (
                <div className="flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  <span>{data.personalInfo.phone}</span>
                </div>
              )}
              {data.personalInfo.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{data.personalInfo.location}</span>
                </div>
              )}
            </div>

            {/* Links */}
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              {data.personalInfo.linkedin && (
                <a 
                  href={data.personalInfo.linkedin} 
                  className="flex items-center gap-1 text-blue-600 hover:underline"
                >
                  <Linkedin className="w-4 h-4" />
                  <span>LinkedIn</span>
                </a>
              )}
              {data.personalInfo.github && (
                <a 
                  href={data.personalInfo.github} 
                  className="flex items-center gap-1 text-blue-600 hover:underline"
                >
                  <Github className="w-4 h-4" />
                  <span>GitHub</span>
                </a>
              )}
              {data.personalInfo.website && (
                <a 
                  href={data.personalInfo.website} 
                  className="flex items-center gap-1 text-blue-600 hover:underline"
                >
                  <Globe className="w-4 h-4" />
                  <span>Website</span>
                </a>
              )}
            </div>
          </div>

          {/* Sections */}
          {data.sections
            .filter(section => section.visible && section.items && section.items.length > 0)
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map((section, index) => (
              <div key={index} className="space-y-3">
                <h2 className="text-xl font-bold text-gray-900 border-b-2 border-gray-200 pb-2">
                  {section.title}
                </h2>
                <div className="space-y-2">
                  {renderSectionItems(section)}
                </div>
              </div>
            ))}

          {/* Empty State */}
          {data.sections.filter(section => section.visible && section.items && section.items.length > 0).length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p>Start adding content to see your resume preview</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ResumePreview;