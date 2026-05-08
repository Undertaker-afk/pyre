import { useMemo, useRef, useEffect } from "react";
import { useWorkspace } from "@/store/workspace";
import { Hex } from "@/decompiler/types";
import { getAllStrings } from "@/parsers/strings";

export function GlobalSearch() {
  const binary = useWorkspace((s) => s.binary);
  const isOpen = useWorkspace((s) => s.isSearchOpen);
  const setOpen = useWorkspace((s) => s.setSearchOpen);
  const term = useWorkspace((s) => s.searchTerm);
  const setTerm = useWorkspace((s) => s.setSearchTerm);
  const openTab = useWorkspace((s) => s.openTab);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const results = useMemo(() => {
    if (!binary || term.length < 2) return [];
    const q = term.toLowerCase();
    const matches: { addr: Hex; name: string; type: string }[] = [];

    // Search functions
    for (const f of binary.functions) {
      if (f.name.toLowerCase().includes(q) || f.addr.toString(16).includes(q)) {
        matches.push({ addr: f.addr, name: f.name, type: "function" });
      }
    }

    // Search strings
    const strings = getAllStrings(binary);
    for (const s of strings) {
      if (s.content.toLowerCase().includes(q) || s.addr.toString(16).includes(q)) {
        matches.push({ addr: s.addr, name: s.content, type: "string" });
      }
    }

    return matches.slice(0, 100);
  }, [binary, term]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div className="w-full max-w-2xl bg-ink-900 border border-ink-700 rounded-lg shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-ink-800">
          <input
            ref={inputRef}
            className="w-full bg-transparent text-xl text-white outline-none placeholder:text-ink-600"
            placeholder="Global search (functions, addresses, strings...)"
            value={term}
            onChange={e => setTerm(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Escape") setOpen(false);
              if (e.key === "Enter" && results[0]) {
                openTab(results[0].addr);
                setOpen(false);
              }
            }}
          />
        </div>
        <div className="max-h-[60vh] overflow-auto">
          {results.length === 0 ? (
            <div className="p-8 text-center text-ink-500">
              {term.length < 2 ? "Type at least 2 characters to search..." : "No results found."}
            </div>
          ) : (
            <ul>
              {results.map((r, i) => (
                <li key={`${r.addr}-${i}`}>
                  <button
                    className="w-full px-4 py-3 flex items-center gap-4 hover:bg-ink-800 text-left border-b border-ink-850 last:border-0"
                    onClick={() => {
                      openTab(r.addr);
                      setOpen(false);
                    }}
                  >
                    <span className="text-ink-500 font-mono text-xs w-24 shrink-0">
                      0x{r.addr.toString(16)}
                    </span>
                    <span className="flex-1 text-ink-200 truncate">{r.name}</span>
                    <span className="text-[10px] uppercase tracking-wider text-ink-600 font-bold border border-ink-700 px-1.5 py-0.5 rounded">
                      {r.type}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="p-2 bg-ink-950 text-[10px] text-ink-600 flex justify-between border-t border-ink-800">
          <span>ESC to close</span>
          <span>ENTER to open first result</span>
        </div>
      </div>
    </div>
  );
}
