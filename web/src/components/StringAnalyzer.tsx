import { useMemo } from "react";
import { useWorkspace } from "@/store/workspace";

export function StringAnalyzer() {
  const binary = useWorkspace((s) => s.binary);
  const openTab = useWorkspace((s) => s.openTab);

  const strings = useMemo(() => {
    if (!binary) return [];
    return binary.strings.map(([addr, len]) => ({
      addr,
      len,
      // In a real implementation, we would extract the string bytes here.
      preview: `String at 0x${addr.toString(16)}`,
    })).sort((a, b) => Number(a.addr - b.addr));
  }, [binary]);

  return (
    <div className="mt-4 p-3 bg-ink-900 border border-ink-800 rounded">
      <div className="text-[10px] uppercase font-bold text-ink-500 mb-2">String Analyzer</div>
      <div className="max-h-48 overflow-auto space-y-1">
        {strings.map((s) => (
          <button
            key={s.addr.toString()}
            className="w-full text-left p-1.5 hover:bg-ink-800 rounded flex gap-2 items-center group"
            onClick={() => openTab(s.addr)}
          >
            <span className="text-ink-600 font-mono text-[10px] w-16 shrink-0">0x{s.addr.toString(16)}</span>
            <span className="text-ink-200 text-xs truncate flex-1">{s.preview}</span>
          </button>
        ))}
        {strings.length === 0 && <div className="text-[10px] text-ink-600 italic">No strings indexed</div>}
      </div>
    </div>
  );
}
