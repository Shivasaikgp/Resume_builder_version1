'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ResumeDashboard } from '@/components/dashboard/ResumeDashboard';

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <ResumeDashboard />
    </ProtectedRoute>
  );
}