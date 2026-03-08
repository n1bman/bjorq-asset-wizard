// eslint-disable-next-line react-refresh/only-export-components
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import type { ConnectionStatus, HealthResponse, VersionResponse } from "@/types/api";
import { wizardClient } from "@/services/wizard-client";

interface WizardState {
  enabled: boolean;
  status: ConnectionStatus;
  health: HealthResponse | null;
  version: VersionResponse | null;
  lastPingAt: string | null;
  latency: number | null;
  baseUrl: string;
  setBaseUrl: (url: string) => void;
  setEnabled: (on: boolean) => void;
  refresh: () => Promise<void>;
}

const WizardContext = createContext<WizardState | null>(null);

export function WizardProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(wizardClient.enabled);
  const [status, setStatus] = useState<ConnectionStatus>(wizardClient.status);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [version, setVersion] = useState<VersionResponse | null>(null);
  const [lastPingAt, setLastPingAt] = useState<string | null>(wizardClient.lastPingAt);
  const [latency, setLatency] = useState<number | null>(null);
  const [baseUrl, setBaseUrlState] = useState(wizardClient.baseUrl);

  const refresh = useCallback(async () => {
    if (!wizardClient.enabled) return;
    await wizardClient.checkConnection();
    setStatus(wizardClient.status);
    setLatency(wizardClient.lastLatency);
    setLastPingAt(wizardClient.lastPingAt);
    if (wizardClient.status === "connected") {
      const [h, v] = await Promise.all([wizardClient.getHealth(), wizardClient.getVersion()]);
      setHealth(h);
      setVersion(v);
    }
  }, []);

  const setBaseUrl = useCallback((url: string) => {
    wizardClient.setBaseUrl(url);
    setBaseUrlState(url);
  }, []);

  const setEnabled = useCallback((on: boolean) => {
    wizardClient.setEnabled(on);
    setEnabledState(on);
    if (on) refresh();
    else {
      setStatus("disconnected");
      setHealth(null);
      setVersion(null);
    }
  }, [refresh]);

  useEffect(() => {
    const unsub = wizardClient.subscribe(setStatus);
    if (enabled) refresh();
    const interval = setInterval(() => { if (wizardClient.enabled) refresh(); }, 30000);
    return () => { unsub(); clearInterval(interval); };
  }, [enabled, refresh]);

  return (
    <WizardContext.Provider value={{ enabled, status, health, version, lastPingAt, latency, baseUrl, setBaseUrl, setEnabled, refresh }}>
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard() {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error("useWizard must be used within WizardProvider");
  return ctx;
}
