import { createRemoteJWKSet, jwtVerify } from 'jose';

import { config } from '../../config.js';

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

export type SupabaseJwtClaims = {
  sub: string;
  email?: string;
  role?: string;
  user_metadata?: { full_name?: string; name?: string; timezone?: string };
};

export async function verifySupabaseJwt(
  token: string,
): Promise<SupabaseJwtClaims | null> {
  try {
    if (config.SUPABASE_JWT_SECRET) {
      const secret = new TextEncoder().encode(config.SUPABASE_JWT_SECRET);
      const { payload } = await jwtVerify(token, secret);
      return payload as SupabaseJwtClaims;
    }

    if (!config.SUPABASE_URL && !config.SUPABASE_JWKS_URL) return null;

    if (!jwks) {
      const jwksUrl =
        config.SUPABASE_JWKS_URL ??
        `${config.SUPABASE_URL}/auth/v1/.well-known/jwks.json`;
      jwks = createRemoteJWKSet(new URL(jwksUrl));
    }

    const { payload } = await jwtVerify(token, jwks);
    return payload as SupabaseJwtClaims;
  } catch {
    return null;
  }
}
