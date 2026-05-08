import { useMemo } from "react";
import { useWorkspace } from "@/store/workspace";

export function InstructionProfiler() {
  const focusedAddr = useWorkspace((s) => s.focusedAddr);
  const tabs = useWorkspace((s) => s.tabs);

  const stats = useMemo(() => {
    const tab = tabs.find(t => t.addr === focusedAddr && t.type === "code");
    if (!tab?.code) return [];

    // This is a heuristic: we don't have the raw disassembly easily,
    // but we can look for patterns in the decompiled output or
    // better, if we had P-code access. Since we have GraphView
    // which uses P-code, we'll just count some common C keywords
    // as a proxy for "instruction complexity".
    const keywords = ["if", "while", "for", "switch", "return", "goto"];
    const counts: Record<string, number> = {};

    for (const kw of keywords) {
      const re = new RegExp(`\\b${kw}\\b`, 'g');
      counts[kw] = (tab.code.match(re) || []).length;
    }

    return Object.entries(counts)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);
  }, [focusedAddr, tabs]);

  if (stats.length === 0) return null;

  const maxCount = stats.length > 0 ? stats[0][1] : 1;

  return (
    <div className="mt-4 p-3 bg-ink-900 border border-ink-800 rounded">
      <div className="text-[10px] uppercase font-bold text-ink-500 mb-2">Complexity Profiler</div>
      <div className="space-y-1.5">
        {stats.map(([name, count]) => (
          <div key={name} className="flex items-center gap-2">
            <div className="text-[10px] font-mono text-ink-400 w-12">{name}</div>
            <div className="flex-1 h-1.5 bg-ink-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent"
                style={{ width: `${(count / maxCount) * 100}%` }}
              />
            </div>
            <div className="text-[10px] font-mono text-ink-500">{count}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
