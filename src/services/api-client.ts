// Base API client with connection tracking, HA ingress support, and fallback

import type { ConnectionStatus } from "@/types/api";

import { REQUEST_TIMEOUT } from "@/lib/upload-limits";

const STORAGE_KEY = "bjorq_api_base_url";
const DEFAULT_URL = "http://localhost:3500";

/**
 * Detect the API base URL for HA ingress or standalone mode.
 *
 * HA ingress serves the UI at /api/hassio_ingress/<token>/
 * In that case, API calls go to the same origin + ingress prefix.
 * Otherwise, fall back to localStorage or localhost:3500.
 */
function detectBaseUrl(): string {
  // Check localStorage override first
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return stored;

  // Detect HA ingress path
  const path = window.location.pathname;
  const ingressMatch = path.match(/^(\/api\/hassio_ingress\/[^/]+)/);
  if (ingressMatch) {
    // Running inside HA ingress — API is at same origin + ingress prefix
    return `${window.location.origin}${ingressMatch[1]}`;
  }

  // Check if we're served from the same origin as the API (production Docker)
  if (window.location.port === "3500" || window.location.pathname === "/") {
    // Could be running from the Fastify server directly
    return window.location.origin;
  }

  return DEFAULT_URL;
}

export class ApiError extends Error {
  status: number;
  stage?: string;
  details?: string;

  constructor(message: string, status: number, stage?: string, details?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.stage = stage;
    this.details = details;
  }
}

type ConnectionListener = (status: ConnectionStatus) => void;

class ApiClient {
  private _baseUrl: string;
  private _status: ConnectionStatus = "checking";
  private _listeners: Set<ConnectionListener> = new Set();
  private _lastLatency: number | null = null;

  constructor() {
    this._baseUrl = detectBaseUrl();
  }

  get baseUrl() { return this._baseUrl; }
  get status() { return this._status; }
  get lastLatency() { return this._lastLatency; }

  setBaseUrl(url: string) {
    this._baseUrl = url.replace(/\/+$/, "");
    localStorage.setItem(STORAGE_KEY, this._baseUrl);
  }

  /** Clear the stored override and re-detect */
  resetBaseUrl() {
    localStorage.removeItem(STORAGE_KEY);
    this._baseUrl = detectBaseUrl();
  }

  subscribe(listener: ConnectionListener) {
    this._listeners.add(listener);
    return () => { this._listeners.delete(listener); };
  }

  private _notify(status: ConnectionStatus) {
    this._status = status;
    this._listeners.forEach((fn) => fn(status));
  }

  async checkConnection(): Promise<boolean> {
    this._notify("checking");
    try {
      const start = performance.now();
      const res = await this.request<{ status: string }>("/health", { timeout: 5000 });
      this._lastLatency = Math.round(performance.now() - start);
      const ok = res.status === "ok";
      this._notify(ok ? "connected" : "disconnected");
      return ok;
    } catch {
      this._lastLatency = null;
      this._notify("disconnected");
      return false;
    }
  }

  async request<T>(path: string, opts?: RequestInit & { timeout?: number; onUploadProgress?: (percent: number) => void }): Promise<T> {
    const { timeout = REQUEST_TIMEOUT, onUploadProgress, ...init } = opts || {};

    // Use XMLHttpRequest for upload progress when callback is provided and body is FormData
    if (onUploadProgress && init.body instanceof FormData) {
      return this._requestWithProgress<T>(path, init, timeout, onUploadProgress);
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await fetch(`${this._baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: { message: res.statusText } }));
        const errorMsg = body.error?.message || body.error || "Request failed";
        throw new ApiError(errorMsg, res.status, body.stage, body.details);
      }
      return res.json();
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof ApiError) throw err;
      if ((err as Error).name === "AbortError") {
        throw new ApiError("Request timed out", 0);
      }
      throw new ApiError("Backend unreachable", 0);
    }
  }

  /** Upload with XMLHttpRequest for progress tracking */
  private _requestWithProgress<T>(path: string, init: RequestInit, timeout: number, onProgress: (percent: number) => void): Promise<T> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(init.method || "POST", `${this._baseUrl}${path}`);
      xhr.timeout = timeout;

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            reject(new ApiError("Invalid JSON response", xhr.status));
          }
        } else {
          let message = "Request failed";
          let stage: string | undefined;
          let details: string | undefined;
          try {
            const body = JSON.parse(xhr.responseText);
            message = body.error?.message || body.error || message;
            stage = body.stage;
            details = body.details;
          } catch { /* ignore */ }
          reject(new ApiError(message, xhr.status, stage, details));
        }
      };

      xhr.onerror = () => reject(new ApiError("Backend unreachable", 0));
      xhr.ontimeout = () => reject(new ApiError("Request timed out", 0));

      xhr.send(init.body as FormData);
    });
  }
}

// Singleton
export const apiClient = new ApiClient();
