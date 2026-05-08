import { useMemo, useState } from "react";
import { useWorkspace } from "@/store/workspace";
import { Hex } from "@/decompiler/types";

interface TreeNodeProps {
  addr: Hex;
  name: string;
  depth: number;
  isExpanded: boolean;
  onToggle: (addr: string) => void;
  onSelect: (addr: Hex) => void;
  expandedNodes: Set<string>;
}

function TreeNode({ addr, name, depth, onToggle, onSelect, expandedNodes }: TreeNodeProps) {
  const binary = useWorkspace(s => s.binary);
  const xrefsTo = useWorkspace(s => s.xrefsTo);
  const key = `${addr.toString()}-${depth}`;
  const isExpanded = expandedNodes.has(key);

  const callers = useMemo(() => {
    if (!binary || !isExpanded) return [];
    const list = xrefsTo.get(addr.toString()) ?? [];
    const addrToName = new Map<string, string>();
    for (const f of binary.functions) addrToName.set(f.addr.toString(), f.name);
    return list.map(a => ({
      addr: a,
      name: addrToName.get(a.toString()) ?? `FUN_${a.toString(16)}`,
    }));
  }, [binary, addr, isExpanded, xrefsTo]);

  return (
    <div className="text-xs font-mono">
      <div
        className="flex items-center gap-1 py-0.5 hover:bg-ink-800 cursor-pointer group"
        style={{ paddingLeft: `${depth * 12}px` }}
        onClick={() => onToggle(key)}
      >
        <span className="text-ink-600 w-3">
          {callers.length > 0 ? (isExpanded ? "▼" : "▶") : "•"}
        </span>
        <button
          className="truncate text-ink-300 group-hover:text-white"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(addr);
          }}
        >
          {name}
        </button>
        <span className="text-ink-600 text-[10px] opacity-0 group-hover:opacity-100">
          0x{addr.toString(16)}
        </span>
      </div>
      {isExpanded && callers.map((c, i) => (
        <TreeNode
          key={`${c.addr}-${depth + 1}-${i}`}
          addr={c.addr}
          name={c.name}
          depth={depth + 1}
          onToggle={onToggle}
          onSelect={onSelect}
          isExpanded={false}
          expandedNodes={expandedNodes}
        />
      ))}
    </div>
  );
}

export function CallerTree({ rootAddr, rootName }: { rootAddr: Hex, rootName: string }) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set([`${rootAddr.toString()}-0`]));
  const openTab = useWorkspace(s => s.openTab);

  const toggleNode = (key: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="p-2 overflow-auto h-full bg-ink-900 border-t border-ink-800">
      <div className="text-[10px] uppercase tracking-wider text-ink-500 mb-2 font-bold">
        Caller Tree (Reverse Call-Graph)
      </div>
      <TreeNode
        addr={rootAddr}
        name={rootName}
        depth={0}
        onToggle={toggleNode}
        onSelect={openTab}
        isExpanded={true}
        expandedNodes={expandedNodes}
      />
    </div>
  );
}
