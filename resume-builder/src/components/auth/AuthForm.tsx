import React, { useState } from 'react';

interface AuthFormProps {
  type: 'signin' | 'signup';
}

export const AuthForm: React.FC<AuthFormProps> = ({ type }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    
    // Mock form validation
    if (!email) {
      setError('Email is required');
      setIsSubmitting(false);
      return;
    }
    
    if (!password) {
      setError('Password is required');
      setIsSubmitting(false);
      return;
    }
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
    }, 1000);
  };

  return (
    <form onSubmit={handleSubmit} aria-label={`${type === 'signin' ? 'Sign In' : 'Sign Up'} Form`}>
      <h1>{type === 'signin' ? 'Sign In' : 'Sign Up'}</h1>
      
      <div>
        <label htmlFor="email">Email Address</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-describedby={error ? 'email-error' : undefined}
          required
        />
      </div>
      
      <div>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-describedby={error ? 'password-error' : undefined}
          required
        />
      </div>
      
      {error && (
        <div 
          id="email-error" 
          role="alert" 
          aria-live="polite"
        >
          {error}
        </div>
      )}
      
      <button 
        type="submit" 
        disabled={isSubmitting}
        aria-label={`${type === 'signin' ? 'Sign In' : 'Sign Up'} Button`}
      >
        {isSubmitting ? 'Loading...' : (type === 'signin' ? 'Sign In' : 'Sign Up')}
      </button>
      
      <div role="status" aria-live="polite">
        {isSubmitting && 'Submitting form...'}
      </div>
    </form>
  );
};