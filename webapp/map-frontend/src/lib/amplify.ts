import { Amplify } from 'aws-amplify';

const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || '',
      userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID || '',
      region: process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-1',
      signUpVerificationMethod: 'code' as const,
      loginWith: {
        email: true,
        username: false,
      },
    },
  },
  // Explicit storage configuration for better persistence
  ssr: false,
};

let isConfigured = false;

export function configureAmplify() {
  // Only configure on client side to avoid SSR issues
  if (typeof window === 'undefined') {
    return;
  }

  // Prevent multiple configurations
  if (isConfigured) {
    return;
  }

  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 Amplify Configuration:', {
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
      userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID,
      region: process.env.NEXT_PUBLIC_AWS_REGION,
    });
  }

  // Validate required environment variables
  const requiredEnvVars = {
    userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
    userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID,
    region: process.env.NEXT_PUBLIC_AWS_REGION,
  };

  const missingVars = Object.entries(requiredEnvVars)
    .filter(([_, value]) => !value)
    .map(([key, _]) => key);

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars);
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  try {
    // Ensure we're in a browser environment
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      Amplify.configure(amplifyConfig);
      isConfigured = true;
      console.log('✅ Amplify configured successfully');
      
      // Log storage capabilities
      if (process.env.NODE_ENV === 'development') {
        console.log('💾 Storage check:', {
          localStorage: typeof window.localStorage !== 'undefined',
          sessionStorage: typeof window.sessionStorage !== 'undefined',
          indexedDB: typeof window.indexedDB !== 'undefined',
        });
      }
    } else {
      console.warn('⚠️ Browser environment not ready, skipping Amplify configuration');
    }
  } catch (error) {
    console.error('❌ Failed to configure Amplify:', error);
    throw error;
  }
}

// Automatically configure Amplify when this module is imported on the client side
if (typeof window !== 'undefined') {
  // Use a small delay to ensure DOM is ready
  setTimeout(() => {
    configureAmplify();
  }, 0);
}

export default amplifyConfig; 