import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

import { getProvider, ProviderNotImplementedError } from '../../providers/registry.js';
import { getAuthUser } from './types.js';

const providerIds = ['apple', 'whoop', 'oura', 'garmin', 'fitbit', 'polar', 'cortex'] as const;

export const providersV1 = new Hono();

for (const id of providerIds) {
  providersV1.post(`/${id}`, async (c) => {
    const user = getAuthUser(c);
    const provider = getProvider(id);
    if (!provider) {
      throw new HTTPException(404, { message: 'Unknown provider' });
    }

    const payload = await c.req.json().catch(() => ({}));

    try {
      const result = await provider.ingest(user.id, payload);
      return c.json({ api_version: 'v1', provider: id, user_id: user.id, ...result });
    } catch (err) {
      if (err instanceof ProviderNotImplementedError) {
        throw new HTTPException(501, {
          message: err.message,
        });
      }
      throw err;
    }
  });
}
