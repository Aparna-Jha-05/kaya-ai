import { ShieldAlert } from "lucide-react";
import Card, { CardHeader } from "@/components/ui/Card";
import DataRequirement from "@/components/ui/DataRequirement";
import SupplierLocationMap from "@/components/suppliers/SupplierLocationMap";
import { BIDS, VENDOR_DOCS } from "@/lib/mockData";
import { runAllPatrols } from "@/lib/patrols";
import { COLORS } from "@/lib/constants";

export default function SuppliersPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-widest text-blue">Supplier intelligence</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-text">Suppliers</h1>
        <p className="mt-1 max-w-2xl text-sm text-text/55">Review reliability evidence by supplier. Relationship and geographic analysis activate only when their underlying evidence is available.</p>
      </div>

      <Card>
        <CardHeader title="Supplier review" caption="Delivery history and certificate evidence currently come from the bid review dataset." />
        <div className="divide-y divide-white/5">
          {BIDS.map((bid) => {
            const reliability = runAllPatrols(bid).vice;
            const color = reliability.status === "FLAG" ? COLORS.amber : COLORS.cyan;
            return (
              <div key={bid.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}16`, color }}><ShieldAlert className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1">
                  <span className="font-medium text-text">{bid.vendor}</span>
                  <span className="mt-1 block text-xs text-text/55">{VENDOR_DOCS[bid.id]?.[0] ?? "No delivery-history evidence is available."}</span>
                </span>
                <span className="font-mono text-sm font-bold" style={{ color }}>Risk {reliability.riskScore ?? 0}/10</span>
              </div>
            );
          })}
        </div>
      </Card>

      <SupplierLocationMap />

      <DataRequirement title="Supplier relationship graph" description="Map shared submission IPs, bank accounts, document fingerprints, and verified corporate entities before using integrity signals in a supplier decision." requirements={["Persistent supplier and bid records", "Verified corporate identifiers", "Source provenance for every relationship", "Reviewer disposition for each signal"]} />
      <DataRequirement title="Verified location activation" description="The map now supports interactive road routes using demo coordinates. Replace them with verified supplier locations, geocoding provenance, and a review workflow before a location can influence an operational decision." requirements={["Verified address or coordinates", "Geocoding provenance", "Entity-to-location confidence", "Cluster review workflow"]} />
    </div>
  );
}
