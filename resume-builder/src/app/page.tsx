import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            AI-Powered Resume Builder
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Create professional resumes with intelligent AI assistance.
            Get real-time suggestions, ATS optimization, and beautiful formatting.
          </p>
          <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
            Get Started
          </Button>
        </div>
      </div>
    </div>
  );
}
