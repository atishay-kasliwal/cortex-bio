/**
 * status.atriveo.com — public status page for Cortex Bio.
 * Checks API health and renders a simple HTML status board.
 */
const API_ORIGIN = 'https://api.atriveo.com';
const APP_ORIGIN = 'https://bio.atriveo.com';

type CheckResult = {
  name: string;
  url: string;
  ok: boolean;
  status: number | null;
  latencyMs: number;
  detail?: string;
};

async function probe(name: string, url: string): Promise<CheckResult> {
  const start = Date.now();
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json, text/html' },
      cf: { cacheTtl: 0 },
    });
    const latencyMs = Date.now() - start;
    let detail: string | undefined;
    if (response.headers.get('content-type')?.includes('application/json')) {
      const body = (await response.json()) as { status?: string; service?: string };
      detail = body.service ?? body.status;
    }
    return {
      name,
      url,
      ok: response.ok,
      status: response.status,
      latencyMs,
      detail,
    };
  } catch (error) {
    return {
      name,
      url,
      ok: false,
      status: null,
      latencyMs: Date.now() - start,
      detail: error instanceof Error ? error.message : 'unreachable',
    };
  }
}

function renderPage(checks: CheckResult[], generatedAt: string): string {
  const allOk = checks.every((c) => c.ok);
  const overall = allOk ? 'operational' : 'degraded';
  const overallColor = allOk ? '#16a34a' : '#ca8a04';

  const rows = checks
    .map((check) => {
      const badge = check.ok ? 'Operational' : 'Issue';
      const badgeColor = check.ok ? '#16a34a' : '#dc2626';
      const statusText = check.status ?? '—';
      return `
        <tr>
          <td>${check.name}</td>
          <td><span style="color:${badgeColor};font-weight:600">${badge}</span></td>
          <td>${statusText}</td>
          <td>${check.latencyMs} ms</td>
          <td>${check.detail ?? '—'}</td>
        </tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Cortex Bio Status</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; margin: 0; background: #0b1020; color: #e8edf7; }
    main { max-width: 720px; margin: 0 auto; padding: 48px 20px; }
    h1 { margin: 0 0 8px; font-size: 1.75rem; }
    .overall { display: inline-block; padding: 6px 12px; border-radius: 999px; background: ${overallColor}22; color: ${overallColor}; font-weight: 600; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; background: #121a2e; border-radius: 12px; overflow: hidden; }
    th, td { padding: 12px 14px; text-align: left; border-bottom: 1px solid #1f2a44; font-size: 0.95rem; }
    th { color: #9fb0d0; font-weight: 600; }
    footer { margin-top: 24px; color: #7f8dab; font-size: 0.85rem; }
    a { color: #7dd3fc; }
  </style>
</head>
<body>
  <main>
    <h1>Cortex Bio Status</h1>
    <div class="overall">${overall === 'operational' ? 'All systems operational' : 'Some systems degraded'}</div>
    <table>
      <thead>
        <tr><th>Service</th><th>State</th><th>HTTP</th><th>Latency</th><th>Detail</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <footer>
      Last checked ${generatedAt} UTC ·
      <a href="${APP_ORIGIN}">Atriveo Bio</a> ·
      <a href="https://docs.atriveo.com">API Docs</a>
    </footer>
  </main>
</body>
</html>`;
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return new Response('ok', { status: 200 });
    }

    if (url.pathname !== '/' && url.pathname !== '/index.html') {
      return new Response('Not found', { status: 404 });
    }

    const checks = await Promise.all([
      probe('API', `${API_ORIGIN}/health`),
      probe('App', `${APP_ORIGIN}/`),
      probe('Docs', 'https://docs.atriveo.com/health'),
    ]);

    const html = renderPage(checks, new Date().toISOString());
    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=60',
      },
    });
  },
};
