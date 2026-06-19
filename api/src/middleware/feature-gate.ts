import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';

import { isFeatureEnabled, type FeatureName } from '../lib/features.js';

export function requireFeature(feature: FeatureName) {
  return createMiddleware(async (_c, next) => {
    if (!isFeatureEnabled(feature)) {
      throw new HTTPException(503, {
        message: `Feature "${feature}" is not enabled on this deployment`,
      });
    }
    await next();
  });
}
