import { useMemo } from "react";
import { useWorkspace } from "@/store/workspace";
import { Hex } from "@/decompiler/types";
import { resolveCall, iterCallsites } from "@/decompiler/resolveCall";

export function XrefMiniGraph({ addr, name }: { addr: Hex; name?: string }) {
  const binary = useWorkspace((s) => s.binary);
  const xrefsTo = useWorkspace((s) => s.xrefsTo);
  const tabs = useWorkspace((s) => s.tabs);
  const openTab = useWorkspace((s) => s.openTab);

  const callers = useMemo(() => {
    if (!binary) return [];
    const list = xrefsTo.get(addr.toString()) ?? [];
    const addrToName = new Map<string, string>();
    for (const f of binary.functions) addrToName.set(f.addr.toString(), f.name);
    return list.map((a) => ({
      addr: a,
      name: addrToName.get(a.toString()) ?? `FUN_${a.toString(16)}`,
    }));
  }, [binary, addr, xrefsTo]);

  const callees = useMemo(() => {
    const tab = tabs.find((t) => t.addr === addr && t.type === "code");
    if (!binary || !tab?.code) return [];
    const nameToAddr = new Map<string, Hex>();
    const addrToName = new Map<string, string>();
    for (const f of binary.functions) {
      nameToAddr.set(f.name, f.addr);
      addrToName.set(f.addr.toString(), f.name);
    }
    const out: { addr: Hex; name: string }[] = [];
    const seen = new Set<string>();
    for (const id of iterCallsites(tab.code)) {
      const calleeAddr = resolveCall(id, nameToAddr);
      if (calleeAddr == null || calleeAddr === addr) continue;
      const key = calleeAddr.toString();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ addr: calleeAddr, name: addrToName.get(key) ?? id });
    }
    return out;
  }, [binary, addr, tabs]);

  return (
    <div className="w-64 bg-ink-900 border border-ink-700 rounded shadow-2xl overflow-hidden pointer-events-auto">
      <div className="bg-ink-800 px-2 py-1 text-[10px] uppercase font-bold text-ink-400 border-b border-ink-700">
        Xref Mini-Graph {name ? `: ${name}` : ""}
      </div>
      <div className="p-2 space-y-3">
        <div>
          <div className="text-[10px] text-ink-500 mb-1">CALLERS ({callers.length})</div>
          <div className="space-y-0.5">
            {callers.slice(0, 5).map((c) => (
              <button
                key={c.addr.toString()}
                className="block w-full text-left truncate text-[10px] text-ink-300 hover:text-white"
                onClick={() => openTab(c.addr)}
              >
                ← {c.name}
              </button>
            ))}
            {callers.length > 5 && <div className="text-[9px] text-ink-600">... and {callers.length - 5} more</div>}
            {callers.length === 0 && <div className="text-[9px] text-ink-600 italic">No callers</div>}
          </div>
        </div>
        <div className="h-px bg-ink-800" />
        <div>
          <div className="text-[10px] text-ink-500 mb-1">CALLEES ({callees.length})</div>
          <div className="space-y-0.5">
            {callees.slice(0, 5).map((c) => (
              <button
                key={c.addr.toString()}
                className="block w-full text-left truncate text-[10px] text-ink-300 hover:text-white"
                onClick={() => openTab(c.addr)}
              >
                → {c.name}
              </button>
            ))}
            {callees.length > 5 && <div className="text-[9px] text-ink-600">... and {callees.length - 5} more</div>}
            {callees.length === 0 && <div className="text-[9px] text-ink-600 italic">No callees</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
