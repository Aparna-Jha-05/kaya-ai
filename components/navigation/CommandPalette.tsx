"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, FileText, Search, ShieldAlert, X } from "lucide-react";

type Command = {
  label: string;
  hint?: string;
  href: string;
  Icon: typeof ClipboardCheck;
};

const COMMANDS: Command[] = [
  { label: "Open work queue", href: "/", Icon: ClipboardCheck },
  { label: "Compare bids", href: "/bids", Icon: FileText },
  { label: "Review Vendor A", hint: "⌘1", href: "/bids/A", Icon: FileText },
  { label: "Review Vendor B", hint: "⌘2", href: "/bids/B", Icon: ShieldAlert },
  { label: "Review Vendor C", hint: "⌘3", href: "/bids/C", Icon: FileText },
  { label: "Open Vendor B action", hint: "⌘R", href: "/bids/B", Icon: ShieldAlert },
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
      const command = shortcut === "1" ? COMMANDS[2] : shortcut === "2" ? COMMANDS[3] : shortcut === "3" ? COMMANDS[4] : shortcut === "r" ? COMMANDS[5] : undefined;
      if (command) { event.preventDefault(); run(command.href); }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  if (!open) return null;

  return <div className="fixed inset-0 z-50 bg-bg/70 p-4 backdrop-blur-sm" role="presentation" onMouseDown={() => setOpen(false)}><section role="dialog" aria-modal="true" aria-label="Command palette" onMouseDown={(event) => event.stopPropagation()} className="mx-auto mt-[12vh] w-full max-w-xl overflow-hidden rounded-xl border border-line bg-card shadow-2xl"><div className="flex items-center gap-3 border-b border-white/10 px-4 py-3"><Search className="h-4 w-4 text-cyan" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search commands" className="min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text/40" /><button type="button" onClick={() => setOpen(false)} aria-label="Close command palette" className="rounded p-1 text-text/50 hover:bg-white/5 hover:text-text"><X className="h-4 w-4" /></button></div><div className="p-2">{commands.map(({ label, hint, href, Icon }) => <button key={label} type="button" onClick={() => run(href)} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm text-text/75 hover:bg-cyan/10 hover:text-cyan"><Icon className="h-4 w-4" /><span className="flex-1">{label}</span>{hint && <kbd className="rounded border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-text/45">{hint}</kbd>}</button>)}{commands.length === 0 && <p className="px-3 py-6 text-center text-sm text-text/50">No matching command.</p>}</div></section></div>;
}
