const LOCAL_API_BASE_URL = 'http://localhost:8000';
const LOCAL_HEALTH_CHECK_PATH = '/api/v1/health';
const LOCAL_HEALTH_CHECK_TIMEOUT_MS = 1000;

function normalize(url: string): string {
  return url.replace(/\/+$/, '');
}

async function probeLocalBackend(): Promise<string> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), LOCAL_HEALTH_CHECK_TIMEOUT_MS);

    const response = await fetch(`${LOCAL_API_BASE_URL}${LOCAL_HEALTH_CHECK_PATH}`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return LOCAL_API_BASE_URL;
    }
  } catch {
    // Local backend isn't running/reachable — fall back to relative /api paths,
    // which only work if something (e.g. a Vite proxy) is serving them locally.
  }

  return '';
}

let baseUrlPromise: Promise<string> | null = null;

// Resolves the API base URL to use, caching the decision for the lifetime of
// the page load:
// - An explicit VITE_API_BASE_URL always wins, no probing.
// - In a real deployed build, the frontend and backend are served from the
//   same Vercel project/origin, so a relative base URL ('') is all we need.
// - Only when running the frontend locally (`vite dev`, no explicit
//   override) do we try http://localhost:8000 first, falling back to a
//   relative base URL if it isn't reachable within LOCAL_HEALTH_CHECK_TIMEOUT_MS.
export function resolveApiBaseUrl(): Promise<string> {
  const explicitBaseUrl = import.meta.env.VITE_API_BASE_URL;

  if (explicitBaseUrl) {
    return Promise.resolve(normalize(explicitBaseUrl));
  }

  if (!import.meta.env.DEV) {
    return Promise.resolve('');
  }

  if (!baseUrlPromise) {
    baseUrlPromise = probeLocalBackend();
  }

  return baseUrlPromise;
}
