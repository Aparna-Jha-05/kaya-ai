"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, FilePlus2, FileText, Search, ScrollText, X } from "lucide-react";

type Command = {
  label: string;
  hint?: string;
  href: string;
  Icon: typeof ClipboardCheck;
};

const COMMANDS: Command[] = [
  { label: "Open work queue", href: "/", Icon: ClipboardCheck },
  { label: "Compare bids", href: "/bids", Icon: FileText },
  { label: "Upload a bid", hint: "⌘U", href: "/bids/new", Icon: FilePlus2 },
  { label: "Open activity log", href: "/audit", Icon: ScrollText },
] as const;

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const commands = useMemo(() => COMMANDS.filter((command) => command.label.toLowerCase().includes(query.trim().toLowerCase())), [query]);

  function run(href: string) {
    router.push(href);
    setOpen(false);
    setQuery("");
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const modifier = event.metaKey || event.ctrlKey;
      if (modifier && event.key.toLowerCase() === "k") { event.preventDefault(); setOpen((current) => !current); return; }
      if (!modifier) { if (event.key === "Escape") setOpen(false); return; }
      const shortcut = event.key.toLowerCase();
      const command = shortcut === "u" ? COMMANDS[2] : undefined;
      if (command) { event.preventDefault(); run(command.href); }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  if (!open) return null;

  return <div className="fixed inset-0 z-50 bg-bg/70 p-4 backdrop-blur-sm" role="presentation" onMouseDown={() => setOpen(false)}><section role="dialog" aria-modal="true" aria-label="Command palette" onMouseDown={(event) => event.stopPropagation()} className="mx-auto mt-[12vh] w-full max-w-xl overflow-hidden rounded-2xl border border-line border-b-2 bg-card shadow-2xl"><div className="flex items-center gap-3 border-b border-line px-4 py-3.5"><Search className="h-4 w-4 text-cyan" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search commands" className="min-w-0 flex-1 bg-transparent text-sm font-medium text-text outline-none placeholder:text-text/40" /><button type="button" onClick={() => setOpen(false)} aria-label="Close command palette" className="rounded-lg p-1 text-text/50 hover:bg-surface hover:text-text"><X className="h-4 w-4" /></button></div><div className="p-2">{commands.map(({ label, hint, href, Icon }) => <button key={label} type="button" onClick={() => run(href)} className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-semibold text-text/80 transition-all hover:bg-cyan/10 hover:text-cyan"><Icon className="h-4 w-4" /><span className="flex-1">{label}</span>{hint && <kbd className="rounded-md border border-line bg-surface px-1.5 py-0.5 font-mono text-[10px] font-bold text-text/60">{hint}</kbd>}</button>)}{commands.length === 0 && <p className="px-3 py-6 text-center text-sm font-medium text-text/50">No matching command.</p>}</div></section></div>;
}
