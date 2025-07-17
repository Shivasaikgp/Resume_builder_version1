import { create } from 'zustand';
import { ResumeData, ResumeVersion } from '@/types';

interface ResumeStore {
  currentResume: ResumeData | null;
  versions: ResumeVersion[];
  activeVersionId: string | null;
  
  // Actions
  setCurrentResume: (resume: ResumeData) => void;
  updatePersonalInfo: (info: Partial<ResumeData['personalInfo']>) => void;
  addVersion: (version: ResumeVersion) => void;
  setActiveVersion: (id: string) => void;
}

export const useResumeStore = create<ResumeStore>((set, get) => ({
  currentResume: null,
  versions: [],
  activeVersionId: null,

  setCurrentResume: (resume) => set({ currentResume: resume }),
  
  updatePersonalInfo: (info) => {
    const current = get().currentResume;
    if (current) {
      set({
        currentResume: {
          ...current,
          personalInfo: { ...current.personalInfo, ...info },
        },
      });
    }
  },

  addVersion: (version) => {
    set((state) => ({
      versions: [...state.versions, version],
    }));
  },

  setActiveVersion: (id) => set({ activeVersionId: id }),
}));