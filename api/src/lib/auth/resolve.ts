import { verifyApiKey } from '../api-keys.js';
import { verifySupabaseJwt } from './supabase-jwt.js';
import { resolveUserFromSupabase } from '../user.js';
import type { AuthContext } from './types.js';

function extractBearer(header: string | undefined): string | null {
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token || null;
}

export async function authenticateRequest(
  authorizationHeader: string | undefined,
): Promise<AuthContext | null> {
  const token = extractBearer(authorizationHeader);
  if (!token) return null;

  if (token.startsWith('cb_test_') || token.startsWith('cb_live_')) {
    const auth = await verifyApiKey(token);
    if (!auth) return null;
    return {
      method: 'api_key',
      user: {
        id: auth.user.id,
        email: auth.user.email,
        timezone: auth.user.timezone,
      },
      apiKey: auth.apiKey,
    };
  }

  const claims = await verifySupabaseJwt(token);
  if (!claims?.sub) return null;

  const email = claims.email;
  if (!email) return null;

  const user = await resolveUserFromSupabase({
    sub: claims.sub,
    email,
    fullName:
      claims.user_metadata?.full_name ??
      claims.user_metadata?.name ??
      undefined,
    timezone: claims.user_metadata?.timezone,
  });

  return {
    method: 'jwt',
    supabaseSub: claims.sub,
    user: {
      id: user.id,
      email: user.email,
      timezone: user.timezone,
      supabaseUserId: user.supabaseUserId,
      fullName: user.fullName,
    },
  };
}
