import Link from "next/link";
import { AlertTriangle, ArrowRight, FileWarning, GitCompareArrows, ShieldAlert } from "lucide-react";
import Card, { CardHeader } from "@/components/ui/Card";
import { BIDS } from "@/lib/mockData";
import { runAllPatrols } from "@/lib/patrols";
import { COLORS } from "@/lib/constants";

type QueueItem = {
  bidId: string;
  vendor: string;
  title: string;
  detail: string;
  action: string;
  urgency: "critical" | "review" | "ready";
};

function buildQueue(): QueueItem[] {
  return BIDS.flatMap((bid) => {
    const { building, green, vice, traffic } = runAllPatrols(bid);
    const items: QueueItem[] = [];
    if (building.status === "FAIL" || green.status === "FAIL") {
      items.push({ bidId: bid.id, vendor: bid.vendor, title: "Resolve compliance failures", detail: [building, green].filter((result) => result.status === "FAIL").map((result) => result.detail).join(" "), action: "Review evidence", urgency: "critical" });
    }
    if (!bid.has_safety_cert) {
      items.push({ bidId: bid.id, vendor: bid.vendor, title: "Confirm missing safety certificate", detail: "The required certificate is not present in the submitted evidence.", action: "Prepare RFI", urgency: "review" });
    }
    if (vice.status === "FLAG" || traffic.status === "FLAG") {
      items.push({ bidId: bid.id, vendor: bid.vendor, title: "Review supplier and schedule exposure", detail: `${vice.detail} ${traffic.detail}`, action: "Assess impact", urgency: "review" });
    }
    if (bid.recommendation === "RECOMMENDED") {
      items.push({ bidId: bid.id, vendor: bid.vendor, title: "Complete award review", detail: "All deterministic checks passed. Confirm the procurement decision and rationale.", action: "Open decision", urgency: "ready" });
    }
    return items;
  }).sort((a, b) => ({ critical: 0, review: 1, ready: 2 }[a.urgency] - { critical: 0, review: 1, ready: 2 }[b.urgency]));
}

const urgencyStyle = {
  critical: { label: "Critical", color: COLORS.rose, Icon: AlertTriangle },
  review: { label: "Review", color: COLORS.amber, Icon: FileWarning },
  ready: { label: "Ready", color: COLORS.cyan, Icon: ShieldAlert },
};

export default function WorkQueue() {
  const items = buildQueue();
  const counts = {
    critical: items.filter((item) => item.urgency === "critical").length,
    review: items.filter((item) => item.urgency === "review").length,
    ready: items.filter((item) => item.urgency === "ready").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-blue">Procurement operations</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-text">Work queue</h1>
          <p className="mt-1 max-w-2xl text-sm text-text/55">Review the next evidence-backed action. Compliance outcomes are deterministic; decisions remain human-authorized.</p>
        </div>
        <Link href="/bids" className="inline-flex items-center gap-2 self-start rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-text/70 hover:border-cyan/40 hover:text-cyan sm:self-auto">
          Compare bids <GitCompareArrows className="h-3.5 w-3.5" />
        </Link>
      </div>

      <section aria-label="Queue summary" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {([
          ["Critical actions", counts.critical, COLORS.rose],
          ["Needs review", counts.review, COLORS.amber],
          ["Ready for decision", counts.ready, COLORS.cyan],
        ] as const).map(([label, value, color]) => (
          <Card key={label} accent={color} className="p-4">
            <p className="text-xs uppercase tracking-wide text-text/45">{label}</p>
            <p className="mt-2 font-mono text-3xl font-bold" style={{ color }}>{value}</p>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader title="Actions requiring attention" caption="Ordered by compliance impact, evidence gaps, and decision readiness." />
        <ul className="divide-y divide-white/5">
          {items.map((item, index) => {
            const style = urgencyStyle[item.urgency];
            const Icon = style.Icon;
            return (
              <li key={`${item.bidId}-${item.title}-${index}`}>
                <Link href={`/bids/${item.bidId}`} className="group flex items-start gap-3 px-4 py-4 transition-colors hover:bg-white/[0.025]">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md" style={{ color: style.color, backgroundColor: `${style.color}16` }}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-text">{item.title}</span>
                      <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase" style={{ color: style.color, backgroundColor: `${style.color}16` }}>{style.label}</span>
                      <span className="text-xs text-text/40">{item.vendor}</span>
                    </span>
                    <span className="mt-1 block max-w-3xl text-xs leading-relaxed text-text/55">{item.detail}</span>
                  </span>
                  <span className="hidden items-center gap-1 text-xs font-medium text-cyan sm:flex">{item.action}<ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
