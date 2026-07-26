"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { MapPinned, ShieldAlert } from "lucide-react";
import Card, { CardHeader } from "@/components/ui/Card";
import { BIDS, VENDOR_DOCS } from "@/lib/mockData";
import { runAllPatrols } from "@/lib/patrols";
import { COLORS } from "@/lib/constants";
import type { RouteState } from "@/lib/mapData";

const SupplierMapCanvas = dynamic(() => import("@/components/maps/SupplierMapCanvas"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-text/50">Loading map…</div>,
});

const initialRouteState: RouteState = { status: "loading" };

function formatDistance(meters: number) {
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds: number) {
  const minutes = Math.round(seconds / 60);
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes} min`;
}

export default function SupplierLocationMap() {
  const [selectedId, setSelectedId] = useState("B");
  const [routeState, setRouteState] = useState<RouteState>(initialRouteState);
  const selected = useMemo(() => BIDS.find((bid) => bid.id === selectedId) ?? BIDS[0], [selectedId]);
  const reliability = runAllPatrols(selected).vice;
  const color = reliability.status === "FLAG" ? COLORS.amber : COLORS.cyan;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Card>
        <CardHeader title="Supplier location map" caption="One persistent map updates its selected supplier and road route. Demo coordinates are clearly separated from verified evidence." />
        <div className="relative m-4 h-[360px] overflow-hidden rounded-lg border border-line bg-inset">
          <SupplierMapCanvas selectedId={selected.id} onSelect={setSelectedId} onRouteStateChange={setRouteState} />
          <div className="pointer-events-none absolute bottom-3 left-3 z-[500] rounded border border-amber/30 bg-card/95 px-2.5 py-1.5 text-[10px] text-amber">Demo coordinates — connect verified registration locations before operational use.</div>
        </div>
      </Card>

      <Card accent={color} className="p-5">
        <p className="font-mono text-[10px] uppercase tracking-wider text-text/40">Selected supplier</p>
        <h2 className="mt-1 text-lg font-semibold text-text">{selected.vendor}</h2>
        <p className="mt-1 text-sm text-text/55">Demo location — verification pending</p>
        <div className="mt-5 space-y-4 border-y border-white/10 py-4 text-sm">
          <div><p className="text-xs text-text/40">Reliability risk</p><p className="mt-1 font-mono font-bold" style={{ color }}> {reliability.riskScore ?? 0}/10</p></div>
          <div>
            <p className="text-xs text-text/40">Road route to project site</p>
            {routeState.status === "ready" && <p className="mt-1 font-mono text-xs text-cyan">{formatDistance(routeState.distanceMeters)} · {formatDuration(routeState.durationSeconds)} drive</p>}
            {routeState.status === "loading" && <p className="mt-1 text-xs text-text/55">Calculating road route…</p>}
            {routeState.status === "unavailable" && <p className="mt-1 text-xs leading-relaxed text-amber">Road route unavailable. No straight-line estimate is shown.</p>}
          </div>
          <div><p className="text-xs text-text/40">Evidence summary</p><p className="mt-1 text-xs leading-relaxed text-text/65">{VENDOR_DOCS[selected.id]?.[0]}</p></div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2" aria-label="Select supplier">
          {BIDS.map((bid) => <button key={bid.id} type="button" onClick={() => setSelectedId(bid.id)} className={`rounded-md border px-2.5 py-1.5 text-xs ${bid.id === selected.id ? "border-cyan/50 bg-cyan/10 text-cyan" : "border-white/10 text-text/55 hover:text-text"}`}>{bid.vendor}</button>)}
        </div>
        <div className="mt-5 flex items-start gap-2 rounded-lg bg-violet/5 p-3 text-xs leading-relaxed text-text/60"><MapPinned className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet" />Select from this panel or the map marker. Pan, zoom, use the scale, and open marker details without replacing the page.</div>
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-violet/5 p-3 text-xs leading-relaxed text-text/60"><ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet" />Location and relationship signals are separate evidence types. A selected marker does not establish collusion or supplier suitability.</div>
      </Card>
    </div>
  );
}
