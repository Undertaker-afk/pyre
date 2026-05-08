import { useMemo } from "react";
import { useWorkspace } from "@/store/workspace";

export function ImportExportExplorer() {
  const binary = useWorkspace((s) => s.binary);
  const openTab = useWorkspace((s) => s.openTab);

  // For simplicity, we use binary.symbols and filter for what looks like imports
  const imports = useMemo(() => {
    if (!binary) return [];
    return binary.symbols
      .filter(([_, name]) => name.includes("@") || name.startsWith("__imp_") || name.startsWith("_"))
      .map(([addr, name]) => ({ addr, name }));
  }, [binary]);

  return (
    <div className="mt-4 p-3 bg-ink-900 border border-ink-800 rounded">
      <div className="text-[10px] uppercase font-bold text-ink-500 mb-2">Imports / Exports</div>
      <div className="max-h-48 overflow-auto space-y-1">
        {imports.map((imp) => (
          <button
            key={imp.addr.toString() + imp.name}
            className="w-full text-left p-1.5 hover:bg-ink-800 rounded flex gap-2 items-center group"
            onClick={() => openTab(imp.addr)}
          >
            <span className="text-ink-600 font-mono text-[10px] w-16 shrink-0">0x{imp.addr.toString(16)}</span>
            <span className="text-ink-200 text-xs truncate flex-1">{imp.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
