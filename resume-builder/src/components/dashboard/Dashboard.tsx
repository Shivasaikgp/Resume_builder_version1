import React from 'react';

interface DashboardProps {
  resumes?: Array<{
    id: string;
    title: string;
    updatedAt: Date;
  }>;
}

export const Dashboard: React.FC<DashboardProps> = ({ resumes = [] }) => {
  return (
    <div data-testid="dashboard">
      <header role="banner">
        <h1>Resume Dashboard</h1>
        <button data-testid="create-resume-button">Create New Resume</button>
      </header>
      
      <main role="main">
        <nav role="navigation" aria-label="Resume management">
          <button data-testid="create-resume-button">Create Resume</button>
        </nav>
        
        <section>
          <h2>Your Resumes</h2>
          {resumes.map((resume) => (
            <article 
              key={resume.id}
              data-testid={`resume-card-${resume.id}`}
              role="article"
              tabIndex={0}
              aria-label={`Resume: ${resume.title}`}
            >
              <h3>{resume.title}</h3>
              <p>Last updated: {resume.updatedAt.toLocaleDateString()}</p>
              <button>Edit</button>
              <button>Download</button>
              <button>Delete</button>
            </article>
          ))}
        </section>
      </main>
      
      <footer role="contentinfo">
        <p>Resume Builder Footer</p>
      </footer>
    </div>
  );
};