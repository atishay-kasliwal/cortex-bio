import { config } from '../config.js';

export const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'Cortex Bio Wearable Intelligence API',
    version: '1.0.0',
    description:
      'Transform wearable biometrics into cognitive readiness, chronotype insights, performance windows, and forecasts. API-first wearable intelligence infrastructure.',
    contact: {
      name: 'Cortex Bio',
      url: 'https://github.com/atriveo/cortex-bio',
    },
    license: { name: 'MIT', url: 'https://opensource.org/licenses/MIT' },
  },
  servers: [
    { url: config.PUBLIC_API_URL, description: 'Production' },
    { url: 'http://localhost:8000', description: 'Local development' },
  ],
  security: [{ bearerAuth: [] }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        description: 'API key (`cb_test_...` or `cb_live_...`)',
      },
    },
    schemas: {
      ReadinessToday: {
        type: 'object',
        properties: {
          api_version: { type: 'string', example: 'v1' },
          date: { type: 'string', format: 'date' },
          readiness_score: { type: 'number', example: 84 },
          contributors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                factor: { type: 'string' },
                impact: { type: 'string' },
                direction: { type: 'string', enum: ['positive', 'negative', 'neutral'] },
              },
            },
          },
          engine_version: { type: 'string', example: 'rules-v1' },
        },
      },
      Forecast: {
        type: 'object',
        properties: {
          api_version: { type: 'string' },
          date: { type: 'string', format: 'date' },
          hourly_forecast: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                hour: { type: 'integer' },
                score: { type: 'number' },
              },
            },
          },
          best_deep_work_window: { $ref: '#/components/schemas/TimeWindow' },
          recovery_window: { $ref: '#/components/schemas/TimeWindow' },
          version: { type: 'string' },
        },
      },
      TimeWindow: {
        type: 'object',
        nullable: true,
        properties: {
          start: { type: 'string', format: 'date-time' },
          end: { type: 'string', format: 'date-time' },
        },
      },
      Error: {
        type: 'object',
        properties: { message: { type: 'string' } },
      },
    },
  },
  paths: {
    '/v1': {
      get: {
        tags: ['Meta'],
        summary: 'API index',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Endpoint directory' } },
      },
    },
    '/v1/readiness/today': {
      get: {
        tags: ['Readiness'],
        summary: 'Cognitive readiness for today',
        description:
          'Explainable readiness score from sleep, HRV, activity, and chronotype.',
        responses: {
          '200': {
            description: 'Readiness brief',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ReadinessToday' },
              },
            },
          },
          '401': { description: 'Invalid API key' },
          '404': { description: 'No wearable data synced for today' },
        },
      },
    },
    '/v1/readiness/history': {
      get: {
        tags: ['Readiness'],
        summary: 'Readiness history',
        parameters: [
          {
            name: 'days',
            in: 'query',
            schema: { type: 'integer', default: 30, maximum: 90 },
          },
        ],
        responses: { '200': { description: 'Daily readiness scores' } },
      },
    },
    '/v1/readiness/{date}': {
      get: {
        tags: ['Readiness'],
        summary: 'Readiness for a date',
        parameters: [
          {
            name: 'date',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'date' },
          },
        ],
        responses: { '200': { description: 'Readiness brief' } },
      },
    },
    '/v1/baselines': {
      get: {
        tags: ['Readiness'],
        summary: '30-day biomarker baselines',
        responses: { '200': { description: 'Personal baselines + chronotype' } },
      },
    },
    '/v1/chronotype': {
      get: {
        tags: ['Readiness'],
        summary: 'Chronotype classification',
        description: 'Morning lark → night owl from sleep wake-time distribution.',
        responses: { '200': { description: 'Chronotype estimate' } },
      },
    },
    '/v1/windows/today': {
      get: {
        tags: ['Windows'],
        summary: 'Cognitive performance windows today',
        description: 'Hourly curve with peak, secondary peak, and crash windows.',
        responses: { '200': { description: 'Cognitive windows' } },
      },
    },
    '/v1/windows/week': {
      get: {
        tags: ['Windows'],
        summary: 'Cognitive windows for the past 7 days',
        responses: { '200': { description: 'Weekly windows' } },
      },
    },
    '/v1/forecast': {
      get: {
        tags: ['Forecast'],
        summary: '24-hour performance forecast',
        description: 'Hourly forecast with best deep-work and recovery windows.',
        responses: {
          '200': {
            description: 'Forecast',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Forecast' },
              },
            },
          },
          '503': { description: 'Forecasting feature disabled' },
        },
      },
    },
    '/v1/insights': {
      get: {
        tags: ['Analytics'],
        summary: 'Personal insights',
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: { '200': { description: 'Insight list' } },
      },
    },
    '/v1/correlations': {
      get: {
        tags: ['Analytics'],
        summary: 'Biomarker ↔ outcome correlations',
        responses: { '200': { description: 'Correlation matrix' } },
      },
    },
    '/v1/trends': {
      get: {
        tags: ['Analytics'],
        summary: 'Biomarker trends over time',
        parameters: [
          { name: 'days', in: 'query', schema: { type: 'integer', default: 30 } },
        ],
        responses: { '200': { description: 'Daily trend series' } },
      },
    },
    '/v1/predictions/tomorrow': {
      get: {
        tags: ['Predictions'],
        summary: 'Tomorrow performance prediction',
        responses: { '200': { description: 'ML prediction' }, '503': { description: 'ML disabled' } },
      },
    },
    '/v1/predictions/week': {
      get: {
        tags: ['Predictions'],
        summary: 'Recent and upcoming predictions',
        responses: { '200': { description: 'Prediction week view' } },
      },
    },
    '/v1/models/status': {
      get: {
        tags: ['Predictions'],
        summary: 'Model training and validation status',
        responses: { '200': { description: 'Model status' } },
      },
    },
    '/v1/cortex/sessions': {
      post: {
        tags: ['Cortex'],
        summary: 'Start or end a work session',
        description: 'Proprietary Cortex integration. Requires FEATURE_CORTEX.',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '201': { description: 'Session created' }, '503': { description: 'Cortex disabled' } },
      },
    },
    '/v1/cortex/telemetry': {
      post: {
        tags: ['Cortex'],
        summary: 'Import Cortex daily telemetry',
        responses: { '200': { description: 'Telemetry ingested' } },
      },
    },
    '/v1/cortex/performance': {
      get: {
        tags: ['Cortex'],
        summary: 'Cortex performance summary',
        parameters: [
          { name: 'days', in: 'query', schema: { type: 'integer', default: 30 } },
        ],
        responses: { '200': { description: 'Performance metrics' } },
      },
    },
  },
  tags: [
    { name: 'Meta', description: 'API metadata' },
    { name: 'Readiness', description: 'Cognitive readiness and chronotype' },
    { name: 'Windows', description: 'Peak performance windows' },
    { name: 'Forecast', description: '24-hour performance forecast' },
    { name: 'Analytics', description: 'Insights and correlations' },
    { name: 'Predictions', description: 'ML performance predictions' },
    { name: 'Cortex', description: 'Atriveo Cortex integration (proprietary)' },
  ],
} as const;
