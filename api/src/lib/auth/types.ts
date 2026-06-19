import type { ApiKeyTier } from '../api-keys.js';

export type AuthUser = {
  id: string;
  email: string;
  timezone: string;
  supabaseUserId?: string | null;
  fullName?: string | null;
};

export type AuthContext = {
  user: AuthUser;
  method: 'api_key' | 'jwt';
  apiKey?: {
    id: string;
    tier: ApiKeyTier;
    rateLimit: number;
    name: string;
  };
  supabaseSub?: string;
};
