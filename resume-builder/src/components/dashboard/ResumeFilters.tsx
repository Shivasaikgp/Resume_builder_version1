'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Filter, 
  X, 
  ChevronDown, 
  SortAsc, 
  SortDesc,
  Calendar,
  Type,
  Clock
} from 'lucide-react';

interface DashboardFilters {
  search: string;
  tags: string[];
  sortBy: 'updatedAt' | 'createdAt' | 'title';
  sortOrder: 'asc' | 'desc';
}

interface ResumeFiltersProps {
  filters: DashboardFilters;
  availableTags: string[];
  onFilterChange: (filters: Partial<DashboardFilters>) => void;
}

export function ResumeFilters({ filters, availableTags, onFilterChange }: ResumeFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);

  const sortOptions = [
    { value: 'updatedAt', label: 'Last Updated', icon: Clock },
    { value: 'createdAt', label: 'Date Created', icon: Calendar },
    { value: 'title', label: 'Title', icon: Type },
  ];

  const handleTagToggle = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter(t => t !== tag)
      : [...filters.tags, tag];
    onFilterChange({ tags: newTags });
  };

  const handleSortChange = (sortBy: DashboardFilters['sortBy']) => {
    const sortOrder = filters.sortBy === sortBy && filters.sortOrder === 'desc' ? 'asc' : 'desc';
    onFilterChange({ sortBy, sortOrder });
  };

  const clearAllFilters = () => {
    onFilterChange({ tags: [], sortBy: 'updatedAt', sortOrder: 'desc' });
  };

  const activeFiltersCount = filters.tags.length + (filters.sortBy !== 'updatedAt' || filters.sortOrder !== 'desc' ? 1 : 0);

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setShowFilters(!showFilters)}
        className="relative hover-lift focus-ring"
      >
        <Filter className="w-4 h-4 mr-2" />
        Filters
        {activeFiltersCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
          >
            {activeFiltersCount}
          </Badge>
        )}
        <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
      </Button>

      {showFilters && (
        <Card className="absolute right-0 top-12 w-80 p-6 shadow-xl border-0 bg-white/95 backdrop-blur-sm z-50 animate-fade-in">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Filters & Sorting</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(false)}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Sort Options */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700 flex items-center">
                <SortAsc className="w-4 h-4 mr-2 text-blue-500" />
                Sort By
              </h4>
              <div className="space-y-2">
                {sortOptions.map((option) => {
                  const Icon = option.icon;
                  const isActive = filters.sortBy === option.value;
                  return (
                    <Button
                      key={option.value}
                      variant={isActive ? "default" : "ghost"}
                      size="sm"
                      onClick={() => handleSortChange(option.value as DashboardFilters['sortBy'])}
                      className={`w-full justify-between ${
                        isActive 
                          ? 'bg-gradient-primary text-white shadow-md' 
                          : 'hover:bg-blue-50 hover:text-blue-700'
                      }`}
                    >
                      <span className="flex items-center">
                        <Icon className="w-4 h-4 mr-2" />
                        {option.label}
                      </span>
                      {isActive && (
                        filters.sortOrder === 'desc' 
                          ? <SortDesc className="w-4 h-4" />
                          : <SortAsc className="w-4 h-4" />
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Tags Filter */}
            {availableTags.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700 flex items-center">
                  <Filter className="w-4 h-4 mr-2 text-green-500" />
                  Filter by Tags
                </h4>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {availableTags.map((tag) => {
                    const isSelected = filters.tags.includes(tag);
                    return (
                      <Button
                        key={tag}
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleTagToggle(tag)}
                        className={`text-xs ${
                          isSelected 
                            ? 'bg-gradient-success text-white shadow-md hover:shadow-lg' 
                            : 'hover:bg-green-50 hover:text-green-700 hover:border-green-300'
                        }`}
                      >
                        {tag}
                        {isSelected && <X className="w-3 h-3 ml-1" />}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Active Filters Summary */}
            {activeFiltersCount > 0 && (
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {activeFiltersCount} filter{activeFiltersCount > 1 ? 's' : ''} active
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Clear All
                  </Button>
                </div>
                
                {/* Selected Tags */}
                {filters.tags.length > 0 && (
                  <div className="mt-3">
                    <div className="flex flex-wrap gap-1">
                      {filters.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="bg-blue-100 text-blue-800 hover:bg-blue-200 cursor-pointer"
                          onClick={() => handleTagToggle(tag)}
                        >
                          {tag}
                          <X className="w-3 h-3 ml-1" />
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Backdrop */}
      {showFilters && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowFilters(false)}
        />
      )}
    </div>
  );
}