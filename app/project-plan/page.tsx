import DataRequirement from "@/components/ui/DataRequirement";
import ProcurementRoadmap from "@/components/project-plan/ProcurementRoadmap";

export default function ProjectPlanPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-widest text-blue">Project delivery</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-text">Project plan</h1>
        <p className="mt-1 max-w-2xl text-sm text-text/55">Procurement impact must be linked to an actual schedule before it can be shown as critical-path exposure.</p>
      </div>

      <ProcurementRoadmap />

      <DataRequirement title="Critical-path Gantt" description="This view remains intentionally unavailable until the schedule can support dependency-aware analysis. A decorative Gantt would overstate certainty." requirements={["Task IDs and dependency edges", "Planned and actual dates", "Float and critical-path calculation", "PO-to-task milestone mapping"]} />
      <DataRequirement title="Delay distribution" description="Monte Carlo schedule exposure becomes decision-ready only after its assumptions, dependencies, and baseline are available to the reviewer." requirements={["Named model assumptions", "Baseline schedule version", "Iteration output and percentile values", "Linked mitigation owner"]} />
    </div>
  );
}
