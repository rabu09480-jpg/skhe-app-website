"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

export type NetworkQuality = "good" | "moderate" | "weak" | "lost";

interface NetworkContextValue {
  dataSaver: boolean;
  toggleDataSaver: () => void;
  setDataSaver: (val: boolean) => void;
  quality: NetworkQuality;
  lastLatencyMs: number | null;
  consecutiveFailures: number;
  isReconnecting: boolean;
  retryConnection: () => Promise<boolean>;
  fetchWithRecovery: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  reportLatency: (ms: number) => void;
  reportFailure: () => void;
}

const NetworkContext = createContext<NetworkContextValue>({
  dataSaver: false,
  toggleDataSaver: () => {},
  setDataSaver: () => {},
  quality: "good",
  lastLatencyMs: null,
  consecutiveFailures: 0,
  isReconnecting: false,
  retryConnection: async () => true,
  fetchWithRecovery: (input, init) => fetch(input, init),
  reportLatency: () => {},
  reportFailure: () => {},
});

interface NetworkInformationLike {
  effectiveType?: "slow-2g" | "2g" | "3g" | "4g";
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
}

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [dataSaver, setDataSaverState] = useState(false);
  const [quality, setQuality] = useState<NetworkQuality>("good");
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const computeQuality = useCallback((latencyMs: number | null, failures: number): NetworkQuality => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return "lost";
    }
    if (failures >= 2) {
      return "lost";
    }
    if (failures === 1) {
      return "weak";
    }

    const nav = typeof navigator !== "undefined" ? (navigator as Navigator & { connection?: NetworkInformationLike }) : null;
    const conn = nav?.connection;
    const eff = conn?.effectiveType;

    if (eff === "slow-2g" || eff === "2g" || (latencyMs !== null && latencyMs > 1500)) {
      return "weak";
    }
    if (eff === "3g" || (latencyMs !== null && latencyMs > 500)) {
      return "moderate";
    }
    return "good";
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("pathshala_data_saver");
      if (saved === "true") {
        setDataSaverState(true);
      } else if (saved === null) {
        const nav = navigator as Navigator & { connection?: NetworkInformationLike };
        if (nav?.connection?.saveData || nav?.connection?.effectiveType === "2g" || nav?.connection?.effectiveType === "slow-2g") {
          setDataSaverState(true);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (dataSaver) {
      document.body.classList.add("data-saver");
    } else {
      document.body.classList.remove("data-saver");
    }
    try {
      localStorage.setItem("pathshala_data_saver", String(dataSaver));
    } catch {
      // ignore
    }
  }, [dataSaver]);

  const reportLatency = useCallback(
    (ms: number) => {
      setLastLatencyMs(ms);
      setConsecutiveFailures(0);
      setIsReconnecting(false);
      setQuality(computeQuality(ms, 0));
    },
    [computeQuality]
  );

  const reportFailure = useCallback(() => {
    setConsecutiveFailures((prev) => {
      const next = prev + 1;
      setQuality(computeQuality(lastLatencyMs, next));
      return next;
    });
  }, [computeQuality, lastLatencyMs]);

  const retryConnection = useCallback(async (): Promise<boolean> => {
    setIsReconnecting(true);
    const start = performance.now();
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      if (res.ok) {
        const ms = Math.round(performance.now() - start);
        reportLatency(ms);
        return true;
      }
      reportFailure();
      setIsReconnecting(false);
      return false;
    } catch {
      reportFailure();
      setIsReconnecting(false);
      return false;
    }
  }, [reportFailure, reportLatency]);

  useEffect(() => {
    const handleOnline = () => {
      retryConnection();
    };
    const handleOffline = () => {
      setQuality("lost");
      setConsecutiveFailures((prev) => Math.max(prev, 2));
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const nav = navigator as Navigator & { connection?: NetworkInformationLike };
    const conn = nav?.connection;
    const handleConnChange = () => {
      setQuality(computeQuality(lastLatencyMs, consecutiveFailures));
    };
    conn?.addEventListener?.("change", handleConnChange);

    // Light periodic health check only when connection is degraded or lost
    if (quality === "lost" || quality === "weak") {
      retryTimerRef.current = setTimeout(() => {
        retryConnection();
      }, 6000);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      conn?.removeEventListener?.("change", handleConnChange);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [computeQuality, consecutiveFailures, lastLatencyMs, quality, retryConnection]);

  const fetchWithRecovery = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const maxAttempts = 3;
      let lastError: unknown;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const start = performance.now();
        try {
          const res = await fetch(input, init);
          const ms = Math.round(performance.now() - start);
          reportLatency(ms);
          return res;
        } catch (err) {
          lastError = err;
          reportFailure();
          if (attempt < maxAttempts - 1) {
            setIsReconnecting(true);
            await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
          }
        }
      }
      setIsReconnecting(false);
      throw lastError;
    },
    [reportFailure, reportLatency]
  );

  const toggleDataSaver = () => setDataSaverState((v) => !v);
  const setDataSaver = (val: boolean) => setDataSaverState(val);

  return (
    <NetworkContext.Provider
      value={{
        dataSaver,
        toggleDataSaver,
        setDataSaver,
        quality,
        lastLatencyMs,
        consecutiveFailures,
        isReconnecting,
        retryConnection,
        fetchWithRecovery,
        reportLatency,
        reportFailure,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  return useContext(NetworkContext);
}
