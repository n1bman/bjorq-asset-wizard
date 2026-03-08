// Wizard API client — separate from the main Bjorq backend client

import type { ConnectionStatus, HealthResponse, VersionResponse, CatalogIndex, AssetMetadata } from "@/types/api";
import { wizardMockCatalog, wizardMockHealth, wizardMockVersion } from "@/services/wizard-mock-data";

const STORAGE_KEY = "bjorq_wizard_url";
const ENABLED_KEY = "bjorq_wizard_enabled";
const DEFAULT_URL = "http://localhost:3500";
const REQUEST_TIMEOUT = 8000;

export class WizardApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "WizardApiError";
    this.status = status;
  }
}

type StatusListener = (status: ConnectionStatus) => void;

class WizardClient {
  private _baseUrl: string;
  private _enabled: boolean;
  private _status: ConnectionStatus = "disconnected";
  private _listeners: Set<StatusListener> = new Set();
  private _lastLatency: number | null = null;
  private _lastPingAt: string | null = null;

  constructor() {
    this._baseUrl = localStorage.getItem(STORAGE_KEY) || DEFAULT_URL;
    this._enabled = localStorage.getItem(ENABLED_KEY) !== "false";
  }

  get baseUrl() { return this._baseUrl; }
  get enabled() { return this._enabled; }
  get status() { return this._status; }
  get lastLatency() { return this._lastLatency; }
  get lastPingAt() { return this._lastPingAt; }

  setBaseUrl(url: string) {
    this._baseUrl = url.replace(/\/+$/, "");
    localStorage.setItem(STORAGE_KEY, this._baseUrl);
  }

  setEnabled(enabled: boolean) {
    this._enabled = enabled;
    localStorage.setItem(ENABLED_KEY, String(enabled));
    if (!enabled) {
      this._status = "disconnected";
      this._notify("disconnected");
    }
  }

  subscribe(listener: StatusListener) {
    this._listeners.add(listener);
    return () => { this._listeners.delete(listener); };
  }

  private _notify(status: ConnectionStatus) {
    this._status = status;
    this._listeners.forEach((fn) => fn(status));
  }

  async checkConnection(): Promise<boolean> {
    if (!this._enabled) {
      this._notify("disconnected");
      return false;
    }
    this._notify("checking");
    try {
      const start = performance.now();
      const res = await this._request<HealthResponse>("/health", { timeout: 5000 });
      this._lastLatency = Math.round(performance.now() - start);
      this._lastPingAt = new Date().toISOString();
      const ok = res.status === "ok";
      this._notify(ok ? "connected" : "disconnected");
      return ok;
    } catch {
      this._lastLatency = null;
      this._notify("disconnected");
      return false;
    }
  }

  private async _request<T>(path: string, opts?: RequestInit & { timeout?: number }): Promise<T> {
    const { timeout = REQUEST_TIMEOUT, ...init } = opts || {};
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(`${this._baseUrl}${path}`, { ...init, signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: { message: res.statusText } }));
        throw new WizardApiError(body.error?.message ?? "Request failed", res.status);
      }
      return res.json();
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof WizardApiError) throw err;
      if ((err as Error).name === "AbortError") throw new WizardApiError("Request timed out", 0);
      throw new WizardApiError("Wizard unreachable", 0);
    }
  }

  // Public API methods with mock fallback
  async getHealth(): Promise<HealthResponse> {
    try { return await this._request<HealthResponse>("/health"); }
    catch { return wizardMockHealth; }
  }

  async getVersion(): Promise<VersionResponse> {
    try { return await this._request<VersionResponse>("/version"); }
    catch { return wizardMockVersion; }
  }

  async getCatalog(): Promise<CatalogIndex> {
    try { return await this._request<CatalogIndex>("/catalog/index"); }
    catch { return wizardMockCatalog; }
  }

  async getAsset(id: string): Promise<AssetMetadata | null> {
    try { return await this._request<AssetMetadata>(`/catalog/asset/${id}`); }
    catch {
      const all = wizardMockCatalog.categories.flatMap(c => c.subcategories.flatMap(s => s.assets));
      return all.find(a => a.id === id) ?? null;
    }
  }
}

export const wizardClient = new WizardClient();
