"use client"

import React, { useState } from 'react';
import { SignInForm } from './sign-in-form';
import { SignUpForm } from './sign-up-form';

interface AuthComponentProps {
  initialMode?: 'signin' | 'signup';
}

export const AuthComponent: React.FC<AuthComponentProps> = ({ initialMode = 'signin' }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);

  const toggleMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
  };

  return (
    <>
      {mode === 'signin' ? (
        <SignInForm onToggleMode={toggleMode} />
      ) : (
        <SignUpForm onToggleMode={toggleMode} />
      )}
    </>
  );
}; 