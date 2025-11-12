/**
 * Utility functions for working with JWT tokens
 */

export interface JWTPayload {
  sub: string;
  aud: string;
  email_verified: boolean;
  event_id: string;
  token_use: string;
  auth_time: number;
  iss: string;
  'cognito:username': string;
  exp: number;
  iat: number;
  email: string;
  'custom:isAdmin'?: string;
  [key: string]: any;
}

/**
 * Decode a JWT token without verification
 * Note: This is for client-side use only, server-side should always verify signatures
 */
export function decodeJWT(token: string): JWTPayload | null {
  console.log('🔍 [JWT] Starting token decode...');
  console.log('🔍 [JWT] Token length:', token.length);
  console.log('🔍 [JWT] Token preview:', token.substring(0, 50) + '...');
  
  try {
    const parts = token.split('.');
    console.log('🔍 [JWT] Token parts count:', parts.length);
    
    if (parts.length !== 3) {
      console.error('❌ [JWT] Invalid token format - expected 3 parts, got:', parts.length);
      return null;
    }
    
    const payload = parts[1];
    console.log('🔍 [JWT] Payload part length:', payload.length);
    
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    
    const decoded = JSON.parse(jsonPayload);
    console.log('✅ [JWT] Successfully decoded token payload');
    console.log('🔍 [JWT] All payload keys:', Object.keys(decoded));
    console.log('🔍 [JWT] Full payload:', decoded);
    
    return decoded;
  } catch (error) {
    console.error('❌ [JWT] Error decoding JWT:', error);
    return null;
  }
}

/**
 * Extract admin status from JWT token
 */
export function isAdminFromToken(token: string): boolean {
  console.log('🔍 [ADMIN] Checking admin status from token...');
  
  const payload = decodeJWT(token);
  if (!payload) {
    console.log('❌ [ADMIN] No payload found, returning false');
    return false;
  }
  
  const adminValue = payload['custom:isAdmin'];
  console.log('🔍 [ADMIN] Raw admin value from token:', adminValue);
  console.log('🔍 [ADMIN] Admin value type:', typeof adminValue);
  
  const isAdmin = adminValue === 'true';
  console.log('✅ [ADMIN] Final admin status:', isAdmin);
  
  return isAdmin;
}

/**
 * Extract user ID from JWT token
 */
export function getUserIdFromToken(token: string): string | null {
  const payload = decodeJWT(token);
  return payload?.sub || null;
}

/**
 * Extract username from JWT token
 */
export function getUsernameFromToken(token: string): string | null {
  const payload = decodeJWT(token);
  return payload?.['cognito:username'] || null;
} 