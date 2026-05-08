import { useMemo } from "react";
import { useWorkspace } from "@/store/workspace";

export function EntropyMap() {
  const binary = useWorkspace((s) => s.binary);

  const data = useMemo(() => {
    if (!binary || binary.regions.length === 0) return [];
    const region = binary.regions[0];
    const bytes = region.bytes;
    const chunkSize = Math.max(256, Math.floor(bytes.length / 500));
    const results = [];

    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.slice(i, i + chunkSize);
      const freqs: Record<number, number> = {};
      for (const b of chunk) freqs[b] = (freqs[b] || 0) + 1;

      let entropy = 0;
      for (const b in freqs) {
        const p = freqs[b] / chunk.length;
        entropy -= p * Math.log2(p);
      }
      results.push(entropy / 8); // Normalized 0-1
    }
    return results;
  }, [binary]);

  return (
    <div className="p-3 bg-ink-900 rounded-lg border border-ink-800">
      <div className="text-[10px] uppercase font-bold text-ink-500 mb-2">Binary Entropy</div>
      <div className="h-12 flex gap-px items-end">
        {data.map((e, i) => (
          <div
            key={i}
            className="flex-1 min-w-[2px]"
            style={{
              height: `${e * 100}%`,
              backgroundColor: `rgb(${e * 255}, ${100 - e * 100}, ${255 - e * 200})`,
            }}
            title={`Entropy: ${e.toFixed(2)}`}
          />
        ))}
      </div>
      <div className="flex justify-between text-[8px] text-ink-600 mt-1 uppercase">
        <span>Start</span>
        <span>End</span>
      </div>
    </div>
  );
}
