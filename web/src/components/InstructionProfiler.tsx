import { useState, useEffect } from "react";
import { useWorkspace } from "@/store/workspace";

export function InstructionProfiler() {
  const focusedAddr = useWorkspace((s) => s.focusedAddr);

  const session = useWorkspace((s) => s.session);
  const [counts, setCounts] = useState<{ name: string; count: number }[]>([]);

  useEffect(() => {
    if (!session || focusedAddr === null) {
      setCounts([]);
      return;
    }

    session.cfg(focusedAddr).then((json) => {
      const data = JSON.parse(json);
      const opcodeCounts: Record<string, number> = {};

      // We can profile either P-code or ASM. ASM is more "instruction" oriented.
      for (const node of data.nodes) {
        for (const line of node.asm) {
          const mnemonic = line.split(" ")[0].toLowerCase();
          if (mnemonic) {
            opcodeCounts[mnemonic] = (opcodeCounts[mnemonic] || 0) + 1;
          }
        }
      }

      const sorted = Object.entries(opcodeCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      setCounts(sorted.slice(0, 15)); // Show top 15 opcodes
    }).catch(() => {
      setCounts([]);
    });
  }, [session, focusedAddr]);

  const stats = counts;

  if (stats.length === 0) return null;

  const maxCount = stats.length > 0 ? stats[0].count : 1;

  return (
    <div className="mt-4 p-3 bg-ink-900 border border-ink-800 rounded">
      <div className="text-[10px] uppercase font-bold text-ink-500 mb-2">Instruction Profiler</div>
      <div className="space-y-1.5">
        {stats.map(({ name, count }: { name: string; count: number }) => (
          <div key={name} className="flex items-center gap-2">
            <div className="text-[10px] font-mono text-ink-400 w-12 truncate" title={name}>{name}</div>
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
