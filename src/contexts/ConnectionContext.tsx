// eslint-disable-next-line react-refresh/only-export-components
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { apiClient } from "@/services/api-client";
import type { ConnectionStatus, HealthResponse, VersionResponse } from "@/types/api";
import { getHealth, getVersion } from "@/services/api";

interface ConnectionState {
  status: ConnectionStatus;
  isConnected: boolean;
  isMockMode: boolean;
  health: HealthResponse | null;
  version: VersionResponse | null;
  latency: number | null;
  baseUrl: string;
  setBaseUrl: (url: string) => void;
  refresh: () => Promise<void>;
}

const ConnectionContext = createContext<ConnectionState | null>(null);

const POLL_INTERVAL = 30_000;

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ConnectionStatus>("checking");
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [version, setVersion] = useState<VersionResponse | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [baseUrl, setBaseUrlState] = useState(apiClient.baseUrl);
  const [isMockMode, setIsMockMode] = useState(true);

  const refresh = useCallback(async () => {
    const connected = await apiClient.checkConnection();
    setStatus(apiClient.status);
    setLatency(apiClient.lastLatency);
    setIsMockMode(!connected);

    try {
      const [h, v] = await Promise.all([getHealth(), getVersion()]);
      setHealth(h);
      setVersion(v);
    } catch { /* already handled */ }
  }, []);

  const setBaseUrl = useCallback((url: string) => {
    apiClient.setBaseUrl(url);
    setBaseUrlState(url);
    refresh();
  }, [refresh]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL);
    const unsub = apiClient.subscribe(setStatus);
    return () => { clearInterval(interval); unsub(); };
  }, [refresh]);

  return (
    <ConnectionContext.Provider value={{
      status, isConnected: status === "connected", isMockMode,
      health, version, latency, baseUrl, setBaseUrl, refresh,
    }}>
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection() {
  const ctx = useContext(ConnectionContext);
  if (!ctx) throw new Error("useConnection must be inside ConnectionProvider");
  return ctx;
}
