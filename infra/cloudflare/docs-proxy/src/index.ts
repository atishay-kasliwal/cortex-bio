/**
 * docs.cortex.bio → api.cortex.bio
 * Proxies OpenAPI docs, Swagger UI, and playground to the Cortex Bio API.
 */
const API_ORIGIN = 'https://api.cortex.bio';

const ALLOWED_PREFIXES = ['/docs', '/openapi.json', '/playground', '/health'];

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const allowed = ALLOWED_PREFIXES.some(
      (p) => url.pathname === p || url.pathname.startsWith(`${p}/`),
    );

    if (!allowed) {
      if (url.pathname === '/' || url.pathname === '') {
        return Response.redirect(`${url.origin}/docs`, 302);
      }
      return new Response('Not found', { status: 404 });
    }

    const target = new URL(url.pathname + url.search, API_ORIGIN);
    const headers = new Headers(request.headers);
    headers.set('Host', new URL(API_ORIGIN).host);

    const response = await fetch(
      new Request(target, {
        method: request.method,
        headers,
        body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
        redirect: 'follow',
      }),
    );

    const out = new Response(response.body, response);
    out.headers.set('Access-Control-Allow-Origin', '*');
    return out;
  },
};
