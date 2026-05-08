import { useWorkspace } from "@/store/workspace";
import { Hex } from "@/decompiler/types";

export function SigMaker({ addr }: { addr: Hex | null }) {
  const binary = useWorkspace((s) => s.binary);

  const makeSig = () => {
    if (!binary || addr === null) return "No address focused";
    const region = binary.regions[0]; // Simplification
    const offset = Number(addr - region.vaddr);
    if (offset < 0 || offset >= region.bytes.length) return "Address out of bounds";

    const bytes = region.bytes.slice(offset, offset + 16);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
      .join(" ");
  };

  const sig = makeSig();

  return (
    <div className="mt-4 p-3 bg-ink-900 border border-ink-800 rounded">
      <div className="text-[10px] uppercase font-bold text-ink-500 mb-2">IDA-style SigMaker</div>
      <div className="font-mono text-xs text-accent break-all select-all cursor-pointer bg-ink-950 p-2 rounded">
        {sig}
      </div>
      <div className="text-[9px] text-ink-600 mt-2 italic">
        Generated 16-byte signature for current function entry.
      </div>
    </div>
  );
}
