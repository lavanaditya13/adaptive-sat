// Desmos ships its calculator as a runtime <script> tag, not an npm package,
// so this loader injects it once and resolves with the resulting global.

const DESMOS_SCRIPT_BASE_URL = 'https://www.desmos.com/api/v1.11/calculator.js';

// Desmos's widely-documented public test/demo API key. It's used across
// countless public Desmos integrations for local dev/testing and is
// explicitly fine for that purpose, but it is rate-limited and watermarked --
// never rely on it for production traffic. Set VITE_DESMOS_API_KEY (see
// constants/environment.ts for the VITE_-prefixed env var convention used
// elsewhere in this app) to a real key before shipping to production.
const DESMOS_DEMO_API_KEY = 'dcb31709b452b1cf9dc26972add0fda6';

export interface DesmosCalculatorInstance {
  destroy: () => void;
  resize?: () => void;
  [key: string]: unknown;
}

export interface DesmosGlobal {
  GraphingCalculator: (
    container: HTMLElement,
    options?: Record<string, unknown>
  ) => DesmosCalculatorInstance;
  ScientificCalculator: (
    container: HTMLElement,
    options?: Record<string, unknown>
  ) => DesmosCalculatorInstance;
}

declare global {
  interface Window {
    Desmos?: DesmosGlobal;
  }
}

// Cached module-level so a second/third caller (e.g. re-opening the
// calculator dialog, or two components mounting it) awaits the same
// in-flight load instead of injecting a duplicate <script> tag -- same
// caching-a-promise idiom as `resolveApiBaseUrl` in
// `src/constants/environment.ts`.
let desmosScriptPromise: Promise<DesmosGlobal> | null = null;

/**
 * Loads the Desmos calculator API script and resolves once `window.Desmos`
 * is available. Rejects on network/script failure so callers can show a
 * friendly inline error instead of a blank screen. Safe to call repeatedly.
 */
export function loadDesmosScript(): Promise<DesmosGlobal> {
  if (typeof window !== 'undefined' && window.Desmos) {
    return Promise.resolve(window.Desmos);
  }

  if (!desmosScriptPromise) {
    desmosScriptPromise = new Promise<DesmosGlobal>((resolve, reject) => {
      const apiKey = import.meta.env.VITE_DESMOS_API_KEY || DESMOS_DEMO_API_KEY;
      const script = document.createElement('script');
      script.src = `${DESMOS_SCRIPT_BASE_URL}?apiKey=${apiKey}`;
      script.async = true;
      script.onload = () => {
        if (window.Desmos) {
          resolve(window.Desmos);
        } else {
          reject(new Error('Desmos script loaded but window.Desmos is unavailable.'));
        }
      };
      script.onerror = () => {
        reject(new Error('Failed to load the Desmos calculator script.'));
      };
      document.head.appendChild(script);
    }).catch((error: unknown) => {
      // Don't cache a permanent failure -- let a retry (e.g. the user
      // clicking "Retry" after reconnecting) attempt the load again.
      desmosScriptPromise = null;
      throw error;
    });
  }

  return desmosScriptPromise;
}
