const LOCAL_API_BASE_URL = 'http://localhost:8000';
const LOCAL_HEALTH_CHECK_PATH = '/api/v1/health';
const LOCAL_HEALTH_CHECK_TIMEOUT_MS = 1000;

function normalize(url: string): string {
  return url.replace(/\/+$/, '');
}

async function probeLocalBackend(): Promise<string | null> {
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
    // Local backend isn't reachable yet — this is deliberately NOT cached
    // below, since it's frequently just a slow cold start (uvicorn/docker
    // compose still booting) rather than "no backend at all." Caching a
    // negative result here previously made auth behavior depend on a
    // one-shot startup race: whichever came up first on page load won for
    // the rest of the session, with no way to recover short of a reload.
  }

  return null;
}

let resolvedLocalBaseUrl: string | null = null;

// Resolves the API base URL to use:
// - An explicit VITE_API_BASE_URL always wins, no probing.
// - In a real deployed build, the frontend and backend are served from the
//   same Vercel project/origin, so a relative base URL ('') is all we need.
// - Only when running the frontend locally (`vite dev`, no explicit
//   override) do we try http://localhost:8000, with a
//   LOCAL_HEALTH_CHECK_TIMEOUT_MS budget per attempt. A successful probe is
//   cached for the rest of the page load; a failed one is not, so requests
//   made after the backend finishes starting up succeed instead of being
//   stuck on whatever the very first request happened to see. There is no
//   Vite dev-server proxy in this repo, so until the backend responds,
//   requests will fail outright rather than silently hitting the wrong origin.
export function resolveApiBaseUrl(): Promise<string> {
  const explicitBaseUrl = import.meta.env.VITE_API_BASE_URL;

  if (explicitBaseUrl) {
    return Promise.resolve(normalize(explicitBaseUrl));
  }

  if (!import.meta.env.DEV) {
    return Promise.resolve('');
  }

  if (resolvedLocalBaseUrl) {
    return Promise.resolve(resolvedLocalBaseUrl);
  }

  return probeLocalBackend().then((result) => {
    if (result) {
      resolvedLocalBaseUrl = result;
      return result;
    }

    return '';
  });
}
