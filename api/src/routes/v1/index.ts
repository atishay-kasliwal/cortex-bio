import { Hono } from 'hono';

import { requireFeature } from '../../middleware/feature-gate.js';
import { requestLog } from '../../middleware/request-log.js';
import { v1Auth } from '../../middleware/auth.js';
import { correlationsV1, insightsV1, trendsV1 } from './analytics.js';
import { baselinesV1, chronotypeV1, readinessV1 } from './readiness.js';
import { cortexV1 } from './cortex.js';
import { modelsV1, predictionsV1 } from './predictions.js';
import type { V1Env } from './types.js';
import { forecastV1, windowsV1 } from './windows.js';
import { providersV1 } from './providers.js';

export const v1 = new Hono<V1Env>();

v1.use('*', requestLog);
v1.use('*', v1Auth);

v1.get('/', (c) =>
  c.json({
    api_version: 'v1',
    service: 'cortex-bio-wearable-intelligence-api',
    docs: '/docs',
    openapi: '/openapi.json',
    endpoints: {
      health: [
        'GET /v1/readiness/today',
        'GET /v1/readiness/history',
        'GET /v1/baselines',
        'GET /v1/chronotype',
      ],
      windows: ['GET /v1/windows/today', 'GET /v1/windows/week', 'GET /v1/forecast'],
      analytics: ['GET /v1/insights', 'GET /v1/correlations', 'GET /v1/trends'],
      ml: [
        'GET /v1/predictions/tomorrow',
        'GET /v1/predictions/week',
        'GET /v1/models/status',
      ],
      cortex: [
        'POST /v1/cortex/sessions',
        'POST /v1/cortex/telemetry',
        'GET /v1/cortex/performance',
      ],
      providers: [
        'POST /v1/providers/apple',
        'POST /v1/providers/whoop',
        'POST /v1/providers/oura',
        'POST /v1/providers/garmin',
        'POST /v1/providers/fitbit',
        'POST /v1/providers/polar',
        'POST /v1/providers/cortex',
      ],
    },
  }),
);

v1.route('/readiness', readinessV1);
v1.route('/baselines', baselinesV1);
v1.route('/chronotype', chronotypeV1);
v1.route('/windows', windowsV1);
v1.route('/forecast', forecastV1);
v1.route('/insights', insightsV1);
v1.route('/correlations', correlationsV1);
v1.route('/trends', trendsV1);
v1.route('/predictions', predictionsV1);
v1.route('/models', modelsV1);
v1.route('/cortex', cortexV1);
v1.route('/providers', providersV1);
