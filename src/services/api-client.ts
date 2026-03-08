// Base API client with connection tracking and fallback support

import type { ConnectionStatus } from "@/types/api";

const STORAGE_KEY = "bjorq_api_base_url";
const DEFAULT_URL = "http://localhost:3500";
const REQUEST_TIMEOUT = 8000;

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type ConnectionListener = (status: ConnectionStatus) => void;

class ApiClient {
  private _baseUrl: string;
  private _status: ConnectionStatus = "checking";
  private _listeners: Set<ConnectionListener> = new Set();
  private _lastLatency: number | null = null;

  constructor() {
    this._baseUrl = localStorage.getItem(STORAGE_KEY) || DEFAULT_URL;
  }

  get baseUrl() { return this._baseUrl; }
  get status() { return this._status; }
  get lastLatency() { return this._lastLatency; }

  setBaseUrl(url: string) {
    this._baseUrl = url.replace(/\/+$/, "");
    localStorage.setItem(STORAGE_KEY, this._baseUrl);
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

  async request<T>(path: string, opts?: RequestInit & { timeout?: number }): Promise<T> {
    const { timeout = REQUEST_TIMEOUT, ...init } = opts || {};
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
        throw new ApiError(body.error?.message ?? "Request failed", res.status);
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
}

// Singleton
export const apiClient = new ApiClient();
