import { useMemo } from "react";
import { useWorkspace } from "@/store/workspace";

export function StatsView() {
  const binary = useWorkspace((s) => s.binary);

  const stats = useMemo(() => {
    if (!binary) return null;
    const regionSizes = binary.regions.reduce((acc, r) => acc + r.bytes.length, 0);
    const fnCount = binary.functions.length;
    const strCount = binary.strings.length;
    const symCount = binary.symbols.length;

    return {
      size: (regionSizes / 1024).toFixed(1) + " KB",
      functions: fnCount,
      strings: strCount,
      symbols: symCount,
      format: binary.format.toUpperCase(),
      arch: binary.arch,
    };
  }, [binary]);

  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 gap-2 p-2">
      <StatCard label="Format" value={stats.format} />
      <StatCard label="Arch" value={stats.arch} />
      <StatCard label="Functions" value={stats.functions} />
      <StatCard label="Strings" value={stats.strings} />
      <StatCard label="Symbols" value={stats.symbols} />
      <StatCard label="Binary Size" value={stats.size} />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-ink-850 p-2 rounded border border-ink-800">
      <div className="text-[9px] uppercase text-ink-500 font-bold">{label}</div>
      <div className="text-sm font-mono text-ink-200">{value}</div>
    </div>
  );
}
