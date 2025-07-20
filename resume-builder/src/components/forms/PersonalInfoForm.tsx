'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { PersonalInfo } from '@/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Mail, Phone, MapPin, Linkedin, Github, Globe } from 'lucide-react';

interface PersonalInfoFormProps {
  data: PersonalInfo;
  onChange: (data: Partial<PersonalInfo>) => void;
}

export function PersonalInfoForm({ data, onChange }: PersonalInfoFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<PersonalInfo>({
    defaultValues: data,
    mode: 'onChange',
  });

  // Watch for changes and update parent component
  const watchedValues = watch();
  React.useEffect(() => {
    onChange(watchedValues);
  }, [watchedValues, onChange]);

  const onSubmit = (formData: PersonalInfo) => {
    onChange(formData);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Full Name */}
      <div className="space-y-2">
        <Label htmlFor="fullName" className="flex items-center gap-2">
          <User className="w-4 h-4" />
          Full Name *
        </Label>
        <Input
          id="fullName"
          {...register('fullName', { required: 'Full name is required' })}
          placeholder="John Doe"
          className={errors.fullName ? 'border-red-500' : ''}
        />
        {errors.fullName && (
          <p className="text-sm text-red-600">{errors.fullName.message}</p>
        )}
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email" className="flex items-center gap-2">
          <Mail className="w-4 h-4" />
          Email Address *
        </Label>
        <Input
          id="email"
          type="email"
          {...register('email', {
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Invalid email address',
            },
          })}
          placeholder="john.doe@example.com"
          className={errors.email ? 'border-red-500' : ''}
        />
        {errors.email && (
          <p className="text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      {/* Phone */}
      <div className="space-y-2">
        <Label htmlFor="phone" className="flex items-center gap-2">
          <Phone className="w-4 h-4" />
          Phone Number
        </Label>
        <Input
          id="phone"
          type="tel"
          {...register('phone')}
          placeholder="+1 (555) 123-4567"
        />
      </div>

      {/* Location */}
      <div className="space-y-2">
        <Label htmlFor="location" className="flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Location
        </Label>
        <Input
          id="location"
          {...register('location')}
          placeholder="New York, NY"
        />
      </div>

      {/* LinkedIn */}
      <div className="space-y-2">
        <Label htmlFor="linkedin" className="flex items-center gap-2">
          <Linkedin className="w-4 h-4" />
          LinkedIn Profile
        </Label>
        <Input
          id="linkedin"
          type="url"
          {...register('linkedin', {
            pattern: {
              value: /^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9-]+\/?$/,
              message: 'Please enter a valid LinkedIn URL',
            },
          })}
          placeholder="https://linkedin.com/in/johndoe"
          className={errors.linkedin ? 'border-red-500' : ''}
        />
        {errors.linkedin && (
          <p className="text-sm text-red-600">{errors.linkedin.message}</p>
        )}
      </div>

      {/* GitHub */}
      <div className="space-y-2">
        <Label htmlFor="github" className="flex items-center gap-2">
          <Github className="w-4 h-4" />
          GitHub Profile
        </Label>
        <Input
          id="github"
          type="url"
          {...register('github', {
            pattern: {
              value: /^https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9-]+\/?$/,
              message: 'Please enter a valid GitHub URL',
            },
          })}
          placeholder="https://github.com/johndoe"
          className={errors.github ? 'border-red-500' : ''}
        />
        {errors.github && (
          <p className="text-sm text-red-600">{errors.github.message}</p>
        )}
      </div>

      {/* Website */}
      <div className="space-y-2">
        <Label htmlFor="website" className="flex items-center gap-2">
          <Globe className="w-4 h-4" />
          Personal Website
        </Label>
        <Input
          id="website"
          type="url"
          {...register('website', {
            pattern: {
              value: /^https?:\/\/.+\..+$/,
              message: 'Please enter a valid URL',
            },
          })}
          placeholder="https://johndoe.com"
          className={errors.website ? 'border-red-500' : ''}
        />
        {errors.website && (
          <p className="text-sm text-red-600">{errors.website.message}</p>
        )}
      </div>

      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Tips for Personal Information</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Use a professional email address</li>
          <li>• Include your city and state/country</li>
          <li>• Add LinkedIn profile to increase visibility</li>
          <li>• Include GitHub if you're in tech</li>
          <li>• Keep phone number format consistent</li>
        </ul>
      </div>
    </form>
  );
}