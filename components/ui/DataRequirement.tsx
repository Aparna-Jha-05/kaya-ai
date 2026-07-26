import { DatabaseZap } from "lucide-react";
import Card from "@/components/ui/Card";

export default function DataRequirement({ title, description, requirements }: { title: string; description: string; requirements: string[] }) {
  return (
    <Card className="p-5" accent="#818CF8">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet/10 text-violet"><DatabaseZap className="h-4 w-4" /></span>
        <div>
          <p className="text-sm font-semibold text-text">{title}</p>
          <p className="mt-1 text-sm leading-relaxed text-text/55">{description}</p>
          <p className="mt-4 font-mono text-[10px] uppercase tracking-wider text-text/40">Required data before activation</p>
          <ul className="mt-2 grid gap-1 text-xs text-text/65 sm:grid-cols-2">
            {requirements.map((requirement) => <li key={requirement}>• {requirement}</li>)}
          </ul>
        </div>
      </div>
    </Card>
  );
}
