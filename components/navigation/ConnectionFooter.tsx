"use client";

import { useEffect, useState } from "react";
import { RefreshCw, WifiOff } from "lucide-react";

export default function ConnectionFooter() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    function handleConnectionError() {
      setOffline(true);
    }

    function handleConnectionSuccess() {
      setOffline(false);
    }

    window.addEventListener("po-lice:connection-error" as any, handleConnectionError);
    window.addEventListener("po-lice:connection-success" as any, handleConnectionSuccess);

    return () => {
      window.removeEventListener("po-lice:connection-error" as any, handleConnectionError);
      window.removeEventListener("po-lice:connection-success" as any, handleConnectionSuccess);
    };
  }, []);

  if (!offline) return null;

  function handleRetry() {
    window.location.reload();
  }

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 rounded-2xl border border-rose/40 bg-card/95 p-3.5 pl-5 pr-4 text-xs shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className="flex items-center gap-2 text-rose font-semibold">
        <WifiOff className="h-4 w-4 animate-pulse shrink-0 text-rose" />
        <span>Service offline or starting up</span>
      </div>
      <button
        type="button"
        onClick={handleRetry}
        className="inline-flex items-center gap-1.5 rounded-xl bg-rose px-3.5 py-1.5 font-bold text-white hover:bg-rose/90 tactile-press shadow-xs transition-all shrink-0"
      >
        <RefreshCw className="h-3.5 w-3.5" /> Retry Connection
      </button>
    </div>
  );
}
