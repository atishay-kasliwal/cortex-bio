import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import { config } from './config.js';
import {
  analytics,
  auth,
  baselines,
  cortex,
  features,
  forecast,
  labels,
  ml,
  predictions,
  profile,
  providers,
  readiness,
  sessions,
  sync,
  windows,
  validation,
  keys,
  meta,
  v1,
  docs,
  admin,
} from './routes/index.js';

const LANDING_HTML = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../../website/index.html'),
  'utf-8',
);
const OPS_HTML = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../../website/ops.html'),
  'utf-8',
);

const app = new Hono();

app.use('*', logger());
app.use(
  '*',
  cors({
    origin: config.CORS_ORIGINS,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Authorization', 'Content-Type'],
    credentials: true,
  }),
);

app.get('/health', (c) =>
  c.json({
    status: 'ok',
    service: 'cortex-bio-api',
    docs: '/docs',
    openapi: '/openapi.json',
    playground: '/playground',
    website: '/',
  }),
);

app.get('/', (c) => c.html(LANDING_HTML));
app.get('/ops', (c) => c.html(OPS_HTML));

app.route('/', docs);

app.route('/api/sync', sync);
app.route('/api/features', features);
app.route('/api/baselines', baselines);
app.route('/api/labels', labels);
app.route('/api/sessions', sessions);
app.route('/api/analytics', analytics);
app.route('/api/readiness', readiness);
app.route('/api/windows', windows);
app.route('/api/cortex', cortex);
app.route('/api/predictions', predictions);
app.route('/api/ml', ml);
app.route('/api/forecast', forecast);
app.route('/api/validation', validation);
app.route('/api/keys', keys);
app.route('/api/auth', auth);
app.route('/api/profile', profile);
app.route('/api/providers', providers);
app.route('/api/meta', meta);
app.route('/api/admin', admin);
app.route('/v1', v1);

serve({ fetch: app.fetch, port: config.PORT }, (info) => {
  console.log(`Cortex Bio ingest API listening on http://localhost:${info.port}`);
});
