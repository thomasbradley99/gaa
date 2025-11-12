'use client';

import { createClient } from '@/lib/api/generated/client/client';
import { createConfig } from '@/lib/api/generated/client/utils';
import { fetchAuthSession } from 'aws-amplify/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://ix2bldcnt9.execute-api.eu-west-1.amazonaws.com/prod/';

// Create our own client instance with interceptors
export const client = createClient(createConfig({
  baseUrl: API_BASE_URL,
}));

// Configure the request interceptor
client.interceptors.request.use(async (request) => {
  console.log('🔑 API request interceptor running for:', request.url);
  
  try {
    console.log('🔍 Attempting to fetch auth session...');
    const session = await fetchAuthSession();
    
    console.log('📋 Session details:', {
      hasSession: !!session,
      hasTokens: !!session.tokens,
      hasIdToken: !!session.tokens?.idToken,
      hasAccessToken: !!session.tokens?.accessToken,
      idTokenLength: session.tokens?.idToken?.toString()?.length || 0
    });
    
    const token = session.tokens?.idToken?.toString();

    if (token) {
      console.log('✅ Setting Authorization header with token length:', token.length);
      request.headers.set('Authorization', `Bearer ${token}`);
      console.log('🎯 Authorization header set:', request.headers.get('Authorization')?.substring(0, 20) + '...');
    } else {
      console.warn('⚠️ No ID token found in session');
      console.log('🔍 Session tokens object:', session.tokens);
    }
  } catch (error) {
    console.error('❌ Error in API request interceptor:', error);
    console.log('🚨 Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack?.substring(0, 200) : 'No stack trace'
    });
  }

  console.log('📤 Final request headers:', Object.fromEntries(request.headers.entries()));
  return request;
}); 