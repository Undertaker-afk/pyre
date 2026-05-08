import { useMemo, useRef, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useWorkspace } from "@/store/workspace";
import { Hex, Region } from "@/decompiler/types";

function getByteAt(regions: Region[], addr: bigint): number | undefined {
  for (const r of regions) {
    if (addr >= r.vaddr && addr < r.vaddr + BigInt(r.bytes.length)) {
      return r.bytes[Number(addr - r.vaddr)];
    }
  }
  return undefined;
}

export function HexDump({ focusedAddr }: { focusedAddr?: Hex | null }) {
  const binary = useWorkspace((s) => s.binary);
  const parentRef = useRef<HTMLDivElement>(null);

  const allData = useMemo(() => {
    if (!binary || binary.regions.length === 0) {
      return { regions: [], startAddr: 0n, totalBytes: 0 };
    }
    const sortedRegions = [...binary.regions].sort((a, b) => (a.vaddr < b.vaddr ? -1 : a.vaddr > b.vaddr ? 1 : 0));
    const first = sortedRegions[0].vaddr;
    const last = sortedRegions[sortedRegions.length - 1];
    const end = last.vaddr + BigInt(last.bytes.length);
    return {
      regions: sortedRegions,
      startAddr: first,
      totalBytes: Number(end - first)
    };
  }, [binary]);

  const { regions, startAddr, totalBytes } = allData;
  const rowCount = Math.ceil(totalBytes / 16);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 20,
    overscan: 20,
  });

  useEffect(() => {
    if (focusedAddr !== undefined && focusedAddr !== null && totalBytes > 0 && focusedAddr >= startAddr && focusedAddr < startAddr + BigInt(totalBytes)) {
      const offset = Number(focusedAddr - startAddr);
      const row = Math.floor(offset / 16);
      virtualizer.scrollToIndex(row, { align: "center" });
    }
  }, [focusedAddr, totalBytes, startAddr]);

  if (totalBytes === 0) return <div className="p-4 text-ink-500">No data to display</div>;

  return (
    <div className="h-full flex flex-col bg-ink-950 font-mono text-[11px]">
      <div className="flex bg-ink-900 border-b border-ink-800 text-ink-500 py-1 px-2 select-none">
        <div className="w-20">Address</div>
        <div className="flex-1 flex justify-around px-4">
          {[...Array(16)].map((_, i) => (
            <span key={i} className="w-6 text-center">{i.toString(16).toUpperCase()}</span>
          ))}
        </div>
        <div className="w-32 px-2">ASCII</div>
      </div>
      <div ref={parentRef} className="flex-1 overflow-auto custom-scrollbar">
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const rowOffset = virtualRow.index * 16;
            const rowAddr = startAddr + BigInt(rowOffset);

            return (
              <div
                key={virtualRow.index}
                className="absolute top-0 left-0 w-full flex px-2 hover:bg-ink-800/50 items-center"
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div className="w-20 text-ink-600 select-none">
                  {rowAddr.toString(16).padStart(8, "0").toUpperCase()}
                </div>
                <div className="flex-1 flex justify-around px-4 text-ink-200">
                  {[...Array(16)].map((_, i) => {
                    const addr = rowAddr + BigInt(i);
                    const byte = getByteAt(regions, addr);
                    const isFocused = addr === focusedAddr;
                    return (
                      <span
                        key={i}
                        className={[
                          "w-6 text-center rounded",
                          isFocused ? "bg-accent text-white" : "",
                          byte === undefined ? "text-ink-800" : "",
                        ].join(" ")}
                      >
                        {byte !== undefined ? byte.toString(16).padStart(2, "0").toUpperCase() : "??"}
                      </span>
                    );
                  })}
                </div>
                <div className="w-32 px-2 text-ink-400 flex justify-between select-none">
                  {[...Array(16)].map((_, i) => {
                    const addr = rowAddr + BigInt(i);
                    const byte = getByteAt(regions, addr);
                    const char = byte !== undefined && byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : ".";
                    const isFocused = addr === focusedAddr;
                    return (
                      <span key={i} className={isFocused ? "text-accent font-bold" : ""}>
                        {char}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
