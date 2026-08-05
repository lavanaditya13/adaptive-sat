const LOCAL_API_BASE_URL = 'http://localhost:8000';
const LOCAL_HEALTH_CHECK_PATH = '/api/v1/health';
const LOCAL_HEALTH_CHECK_TIMEOUT_MS = 1000;

function normalize(url: string): string {
  return url.replace(/\/+$/, '');
}

let baseUrlPromise: Promise<string> | null = null;

// Resolves the API base URL to use, caching the decision for the lifetime of
// the page load:
// - An explicit VITE_API_BASE_URL always wins, no probing.
// - In a real deployed build, the frontend and backend are served from the
//   same Vercel project/origin, so a relative base URL ('') is all we need.
// - Only when running the frontend locally (`vite dev`, no explicit
//   override) do we use http://localhost:8000 by default. The backend must be
//   running for API/OAuth flows to work locally; there is no Vite proxy here.
export function resolveApiBaseUrl(): Promise<string> {
  const explicitBaseUrl = import.meta.env.VITE_API_BASE_URL;

  if (explicitBaseUrl) {
    return Promise.resolve(normalize(explicitBaseUrl));
  }

  if (!import.meta.env.DEV) {
    return Promise.resolve('');
  }

  if (!baseUrlPromise) {
    baseUrlPromise = Promise.resolve(LOCAL_API_BASE_URL);
  }

  return baseUrlPromise;
}
