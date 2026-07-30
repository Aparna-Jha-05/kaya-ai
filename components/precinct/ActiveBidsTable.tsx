"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, RefreshCw } from "lucide-react";
import Card, { CardHeader } from "@/components/ui/Card";
import PatrolBadge from "@/components/bid/PatrolBadge";
import Tooltip from "@/components/ui/Tooltip";
import { procurementApi, type BidRecord } from "@/lib/api";
import { displayCheckName, formatCroreValue } from "@/lib/recordUtils";
import { COLORS } from "@/lib/constants";

type Row = {
  id: string;
  vendor: string;
  model: string;
  cost: number | null;
  tco: number | null;
  rejected: boolean;
  checks: Array<{ name: string; status: "PASS" | "FAIL" | "FLAG"; risk: number | null }>;
};

function fromRecord(record: BidRecord): Row {
  return {
    id: record.id,
    vendor: record.source.vendor_name,
    model: record.source.equipment.model_number,
    cost: record.source.bid_amount_inr,
    tco: record.scorecard.calculated_tco2_inr,
    rejected: record.scorecard.recommendation === "REJECT",
    checks: record.scorecard.patrol_results.map((item) => ({
      name: displayCheckName(item.patrol_name),
      status: item.status,
      risk: item.risk_score,
    })),
  };
}

export default function ActiveBidsTable() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [source, setSource] = useState<"loading" | "live" | "empty" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const loadData = useCallback(() => {
    setSource("loading");
    setErrorMessage("");
    procurementApi
      .list()
      .then((items) => {
        setRows(items.map(fromRecord));
        setSource(items.length > 0 ? "live" : "empty");
      })
      .catch((err) => {
        setErrorMessage(err instanceof Error ? err.message : "Service connection failed");
        setSource("error");
      });
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const check = (row: Row, name: string) => row.checks.find((item) => item.name === name);

  return (
    <Card>
      <CardHeader
        title={
          <Tooltip text="Engineering and carbon are hard checks. Vendor reliability and schedule impact inform review.">
            <span>Submitted bids</span>
          </Tooltip>
        }
        caption={
          source === "error"
            ? "Service connection failed"
            : source === "empty"
            ? "No submitted bids"
            : undefined
        }
      />
      {source === "loading" && (
        <p className="p-6 text-sm text-text/50">Loading submitted bids…</p>
      )}

      {source === "error" && (
        <div className="p-6 space-y-3">
          <p className="text-sm text-rose">{errorMessage}</p>
          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center gap-1.5 rounded-lg bg-cyan/15 px-3 py-1.5 text-xs font-semibold text-cyan hover:bg-cyan/25"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Retry loading bids
          </button>
        </div>
      )}

      {(source === "live" || source === "empty") && (
        <div className="overflow-x-auto rounded-xl border border-line bg-card shadow-xs">
          <table className="w-full text-sm border-collapse table-fixed">
            <colgroup>
              <col className="w-[24%]" />
              <col className="w-[15%]" />
              <col className="w-[11%]" />
              <col className="w-[11%]" />
              <col className="w-[11%]" />
              <col className="w-[18%]" />
              <col className="w-[10%]" />
            </colgroup>
            <thead>
              <tr className="border-b-2 border-line table-header bg-surface/50">
                <th className="px-4 py-3 text-left whitespace-nowrap">Vendor</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Upfront (INR)</th>
                <th className="px-4 py-3 text-center whitespace-nowrap">
                  <Tooltip text="Hard limit check. Validates physical floor load capacity against equipment weight.">
                    <span>Engineering</span>
                  </Tooltip>
                </th>
                <th className="px-4 py-3 text-center whitespace-nowrap">
                  <Tooltip text="Hard limit check. Validates embodied carbon emissions factor against project carbon cap.">
                    <span>Carbon</span>
                  </Tooltip>
                </th>
                <th className="px-4 py-3 text-center whitespace-nowrap">
                  <Tooltip text="Vendor risk score (0-10) calculated from historical performance metrics.">
                    <span>Reliability</span>
                  </Tooltip>
                </th>
                <th className="px-4 py-3 text-right whitespace-nowrap">5-yr TCO (INR)</th>
                <th className="px-4 py-3 text-right whitespace-nowrap" />
              </tr>
            </thead>
            <tbody className="font-mono">
              {rows.length ? (
                rows.map((row) => {
                  const engineering = check(row, "Engineering")?.status ?? "FLAG";
                  const carbon = check(row, "Carbon")?.status ?? "FLAG";
                  const risk = check(row, "Vendor reliability")?.risk;
                  return (
                    <tr
                      key={row.id}
                      onClick={() => router.push(`/bids/${row.id}`)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          router.push(`/bids/${row.id}`);
                        }
                      }}
                      role="link"
                      tabIndex={0}
                      aria-label={`Review bid from ${row.vendor}`}
                      className="group cursor-pointer border-b border-line/40 transition-colors duration-150 hover:bg-cyan/5 dark:hover:bg-cyan/10"
                    >
                      <td className="px-4 py-3 text-left">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: row.rejected ? COLORS.rose : COLORS.cyan }}
                          />
                          <span className="font-sans font-semibold text-text truncate">{row.vendor}</span>
                        </div>
                        <div className="ml-4 mt-0.5 text-[11px] font-medium text-text/45 truncate">{row.model}</div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-text">{formatCroreValue(row.cost)}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center">
                          <PatrolBadge status={engineering} size="sm" />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center">
                          <PatrolBadge status={carbon} size="sm" />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center">
                          <span
                            className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-extrabold tabular-nums border shadow-xs"
                            style={{
                              color: risk != null && risk > 6 ? COLORS.rose : COLORS.cyan,
                              backgroundColor: risk != null && risk > 6 ? `${COLORS.rose}1f` : `${COLORS.cyan}1f`,
                              borderColor: risk != null && risk > 6 ? `${COLORS.rose}50` : `${COLORS.cyan}50`,
                            }}
                          >
                            {risk == null ? "—" : `${risk}/10`}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-text">{formatCroreValue(row.tco)}</td>
                      <td className="px-4 py-3 text-right">
                        <ChevronRight className="ml-auto h-4 w-4 text-text/20 transition-transform group-hover:translate-x-0.5 group-hover:text-text/60" />
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-text/40">
                    No uploaded bids yet. Upload a bid to start review.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
