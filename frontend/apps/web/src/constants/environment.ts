const LOCAL_API_BASE_URL = 'http://localhost:8000';

function normalize(url: string): string {
  return url.replace(/\/+$/, '');
}

let resolvedLocalBaseUrl: string | null = null;

// Resolves the API base URL to use:
// - An explicit VITE_API_BASE_URL always wins, no probing.
// - In a real deployed build, the frontend and backend are served from the
//   same Vercel project/origin, so a relative base URL ('') is all we need.
// - Only when running the frontend locally (`vite dev`, no explicit
//   override) do we always target http://localhost:8000.
//   There is no Vite proxy in this repo, so falling back to a relative
//   origin can silently send auth/email calls to the wrong backend.
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

  resolvedLocalBaseUrl = LOCAL_API_BASE_URL;
  return Promise.resolve(resolvedLocalBaseUrl);
}
