"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { signIn as amplifySignIn, signUp as amplifySignUp, signOut as amplifySignOut, confirmSignUp as amplifyConfirmSignUp, getCurrentUser, fetchAuthSession, fetchUserAttributes } from 'aws-amplify/auth';
import { isAdminFromToken } from '@/lib/jwt-utils';

interface AuthUser {
  username: string;
  userId: string;
  signInDetails?: unknown;
  isAdmin: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<unknown>;
  signUp: (username: string, password: string, email: string, firstName: string, lastName: string) => Promise<unknown>;
  signOut: () => Promise<void>;
  confirmSignUp: (username: string, code: string) => Promise<unknown>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [amplifyReady, setAmplifyReady] = useState(false);

  // Initialize Amplify configuration on client side
  useEffect(() => {
    const initAmplify = async () => {
      try {
        // Import and configure Amplify
        await import("@/lib/amplify");
        setAmplifyReady(true);
      } catch (error) {
        console.error('Failed to initialize Amplify:', error);
        setLoading(false);
      }
    };

    initAmplify();
  }, []);

  // Helper function to set user from current user data
  const setUserFromCurrentUser = async () => {
    try {
      console.log('🔍 [AUTH] Setting user from current user data...');
      const currentUser = await getCurrentUser();
      console.log('🔍 [AUTH] Current user:', currentUser);
      
      // Fetch user attributes to get custom attributes
      const userAttributes = await fetchUserAttributes();
      console.log('🔍 [AUTH] User attributes:', userAttributes);
      
      // Check for isAdmin in custom attributes
      const isAdmin = userAttributes['custom:isAdmin'] === 'true';
      console.log('🔍 [AUTH] isAdmin from attributes:', isAdmin);
      console.log('🔍 [AUTH] Raw custom:isAdmin value:', userAttributes['custom:isAdmin']);
      
      const session = await fetchAuthSession();
      console.log('🔍 [AUTH] Session tokens available:', !!session.tokens);
      console.log('🔍 [AUTH] ID token available:', !!session.tokens?.idToken);
      console.log('🔍 [AUTH] Access token available:', !!session.tokens?.accessToken);
      
      const token = session.tokens?.idToken?.toString();
      console.log('🔍 [AUTH] Token string available:', !!token);
      
      // Also check token as fallback
      const isAdminFromTokenValue = token ? isAdminFromToken(token) : false;
      console.log('🔍 [AUTH] isAdmin from token (fallback):', isAdminFromTokenValue);
      
      // Use attributes first, fallback to token
      const finalIsAdmin = isAdmin || isAdminFromTokenValue;
      console.log('🔍 [AUTH] Final isAdmin result:', finalIsAdmin);
      
      const userData = {
        username: currentUser.username,
        userId: currentUser.userId,
        signInDetails: currentUser.signInDetails,
        isAdmin: finalIsAdmin
      };
      console.log('🔍 [AUTH] Setting user data:', userData);
      
      setUser(userData);
    } catch (error) {
      console.error('❌ [AUTH] Error getting current user:', error);
      throw error;
    }
  };

  // Helper function to clear auth state
  const clearAuthState = async () => {
    try {
      await amplifySignOut();
    } catch (error) {
      console.error('Error clearing auth state:', error);
    }
    setUser(null);
  };

  // Check auth state only after Amplify is ready
  useEffect(() => {
    if (amplifyReady) {
      checkAuthState();
    }
  }, [amplifyReady]);

  const checkAuthState = async () => {
    try {
      console.log('🔍 [AUTH] Checking auth state...');
      // Add a small delay to ensure Amplify is fully initialized
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const session = await fetchAuthSession();
      console.log('🔍 [AUTH] Session fetched, tokens available:', !!session.tokens?.accessToken);
      
      if (session.tokens?.accessToken) {
        console.log('🔍 [AUTH] Access token found, setting user...');
        try {
          await setUserFromCurrentUser();
        } catch (error) {
          console.log('❌ [AUTH] Session exists but user data unavailable, clearing...', error);
          await clearAuthState();
        }
      } else {
        console.log('🔍 [AUTH] No access token found, setting user to null');
        setUser(null);
      }
    } catch (error) {
      console.error('❌ [AUTH] Error checking auth state:', error);
      // Don't clear auth state on error, just set user to null
      setUser(null);
    } finally {
      console.log('🔍 [AUTH] Auth state check complete, setting loading to false');
      setLoading(false);
    }
  };

  const signIn = async (username: string, password: string) => {
    try {
      const result = await amplifySignIn({ username, password });
      
      if (result.isSignedIn) {
        await setUserFromCurrentUser();
      }
      
      return result;
    } catch (error) {
      // Handle stale auth state
      if (error instanceof Error && error.name === 'UserAlreadyAuthenticatedException') {
        console.log('Detected stale auth state, clearing and retrying...');
        await clearAuthState();
        
        const retryResult = await amplifySignIn({ username, password });
        if (retryResult.isSignedIn) {
          await setUserFromCurrentUser();
        }
        return retryResult;
      }
      
      console.error('Error signing in:', error);
      throw error;
    }
  };

  const signUp = async (username: string, password: string, email: string, firstName: string, lastName: string) => {
    try {
      const result = await amplifySignUp({
        username,
        password,
        options: {
          userAttributes: {
            email,
            given_name: firstName,
            family_name: lastName,
          },
        },
      });
      return result;
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  };

  const confirmSignUp = async (username: string, confirmationCode: string) => {
    try {
      const result = await amplifyConfirmSignUp({
        username,
        confirmationCode,
      });
      return result;
    } catch (error) {
      console.error('Error confirming sign up:', error);
      throw error;
    }
  };

  const signOut = async (): Promise<void> => {
    await clearAuthState();
  };

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    confirmSignUp,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 