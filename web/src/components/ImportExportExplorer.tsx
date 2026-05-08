import { useMemo } from "react";
import { useWorkspace } from "@/store/workspace";

export function ImportExportExplorer() {
  const binary = useWorkspace((s) => s.binary);
  const openTab = useWorkspace((s) => s.openTab);

  const data = useMemo(() => {
    if (!binary) return { imports: [], exports: [] };

    // Heuristic: Imports often have @plt, __imp_, or are in a specific region (we don't have section names easily here)
    // Exports are often not starting with FUN_ and not in the "imports" category.
    const symbols = binary.symbols;
    const imports = symbols
      .filter(([_, name]) => name.includes("@") || name.startsWith("__imp_"))
      .map(([addr, name]) => ({ addr, name }));

    const exports = symbols
      .filter(([_, name]) => !name.includes("@") && !name.startsWith("__imp_") && !name.startsWith("FUN_") && !name.startsWith("func_"))
      .map(([addr, name]) => ({ addr, name }));

    return { imports, exports };
  }, [binary]);

  return (
    <div className="mt-4 p-3 bg-ink-900 border border-ink-800 rounded space-y-4">
      <div>
        <div className="text-[10px] uppercase font-bold text-ink-500 mb-2">Imports</div>
        <div className="max-h-32 overflow-auto space-y-1">
          {data.imports.map((imp) => (
            <button
              key={imp.addr.toString() + imp.name}
              className="w-full text-left p-1.5 hover:bg-ink-800 rounded flex gap-2 items-center group"
              onClick={() => openTab(imp.addr)}
            >
              <span className="text-ink-600 font-mono text-[10px] w-16 shrink-0">0x{imp.addr.toString(16)}</span>
              <span className="text-ink-200 text-xs truncate flex-1">{imp.name}</span>
            </button>
          ))}
          {data.imports.length === 0 && <div className="text-[10px] text-ink-600 italic px-1.5">No imports found</div>}
        </div>
      </div>
      <div>
        <div className="text-[10px] uppercase font-bold text-ink-500 mb-2">Exports</div>
        <div className="max-h-32 overflow-auto space-y-1">
          {data.exports.map((exp) => (
            <button
              key={exp.addr.toString() + exp.name}
              className="w-full text-left p-1.5 hover:bg-ink-800 rounded flex gap-2 items-center group"
              onClick={() => openTab(exp.addr)}
            >
              <span className="text-ink-600 font-mono text-[10px] w-16 shrink-0">0x{exp.addr.toString(16)}</span>
              <span className="text-ink-200 text-xs truncate flex-1">{exp.name}</span>
            </button>
          ))}
          {data.exports.length === 0 && <div className="text-[10px] text-ink-600 italic px-1.5">No exports found</div>}
        </div>
      </div>
    </div>
  );
}
