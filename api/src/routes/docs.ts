import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { Hono } from 'hono';

import { getPublicFeatures } from '../lib/features.js';
import { openApiSpec } from '../openapi/spec.js';

const PLAYGROUND_HTML = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../../../playground/index.html'),
  'utf-8',
);

const DOCS_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Cortex Bio API</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    body { margin: 0; background: #0a0a0b; }
    .swagger-ui .topbar { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/openapi.json',
      dom_id: '#swagger-ui',
      deepLinking: true,
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
      layout: 'BaseLayout',
    });
  </script>
</body>
</html>`;

export const docs = new Hono()
  .get('/openapi.json', (c) => c.json(openApiSpec))
  .get('/docs', (c) => c.html(DOCS_HTML))
  .get('/playground', (c) => c.html(PLAYGROUND_HTML))
  .get('/features', (c) =>
    c.json({
      api_version: 'v1',
      features: getPublicFeatures(),
    }),
  );
