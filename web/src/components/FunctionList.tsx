import { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useWorkspace } from "@/store/workspace";

export function FunctionList() {
  const binary = useWorkspace((s) => s.binary);
  const focused = useWorkspace((s) => s.focusedAddr);
  const openTab = useWorkspace((s) => s.openTab);
  const bookmarks = useWorkspace((s) => s.bookmarks);
  const toggleBookmark = useWorkspace((s) => s.toggleBookmark);
  const [filter, setFilter] = useState("");
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const parentRef = useRef<HTMLDivElement | null>(null);

  const items = useMemo(() => {
    if (!binary) return [];
    let list = binary.functions;

    if (showBookmarksOnly) {
      list = list.filter((f) => bookmarks.has(f.addr.toString()));
    }

    const q = filter.trim().toLowerCase();
    if (!q) return list;

    // Cheap fuzzy: substring on name OR address. Sort name-prefix
    // matches first so typing "ma" puts `main` above
    // `__libc_start_main`.
    return list
      .filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.addr.toString(16).includes(q),
      )
      .sort((a, b) => {
        const ap = a.name.toLowerCase().startsWith(q) ? 0 : 1;
        const bp = b.name.toLowerCase().startsWith(q) ? 0 : 1;
        if (ap !== bp) return ap - bp;
        return a.name.localeCompare(b.name);
      });
  }, [binary, filter, showBookmarksOnly, bookmarks]);

  const virtual = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 28,
    overscan: 12,
  });

  return (
    <div className="flex h-full flex-col bg-ink-900 border-r border-ink-800">
      <div className="p-2 border-b border-ink-800 space-y-2">
        <div className="flex gap-2">
          <input
            className="flex-1 px-2 py-1.5 text-sm bg-ink-850 border border-ink-700 rounded focus:outline-none focus:border-accent placeholder:text-ink-500"
            placeholder="Search functions…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <button
            onClick={() => setShowBookmarksOnly(!showBookmarksOnly)}
            className={[
              "px-2 rounded border border-ink-700 transition-colors",
              showBookmarksOnly ? "bg-accent text-white" : "bg-ink-850 text-ink-500",
            ].join(" ")}
            title="Show bookmarks only"
          >
            ★
          </button>
        </div>
        <div className="flex justify-between items-center text-xs text-ink-500 px-1">
          <span>{items.length} of {binary?.functions.length ?? 0}</span>
          {showBookmarksOnly && <span>(Bookmarked)</span>}
        </div>
      </div>
      <div ref={parentRef} className="flex-1 overflow-auto">
        <div
          style={{
            height: virtual.getTotalSize(),
            position: "relative",
          }}
        >
          {virtual.getVirtualItems().map((vi) => {
            const f = items[vi.index];
            const isFocused = focused === f.addr;
            const isBookmarked = bookmarks.has(f.addr.toString());
            return (
              <div
                key={f.addr.toString()}
                className={[
                  "absolute inset-x-0 px-3 text-left text-xs font-mono",
                  "flex items-center gap-2 group",
                  "hover:bg-ink-800 transition-colors",
                  isFocused ? "bg-accent/20 text-white" : "text-ink-300",
                ].join(" ")}
                style={{
                  top: vi.start,
                  height: vi.size,
                }}
              >
                <button
                  className="flex-1 flex items-center gap-2 truncate py-1.5"
                  onClick={() => openTab(f.addr)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    openTab(f.addr, "graph");
                  }}
                  title={`${f.name}  ·  0x${f.addr.toString(16)}${
                    f.size ? `  ·  ${f.size} bytes` : ""
                  }`}
                >
                  <span className="text-ink-500 shrink-0">
                    {f.addr.toString(16).padStart(8, "0").slice(-8)}
                  </span>
                  <span className="truncate">{f.name}</span>
                </button>
                <button
                  onClick={() => toggleBookmark(f.addr)}
                  className={[
                    "opacity-0 group-hover:opacity-100 transition-opacity p-1",
                    isBookmarked ? "opacity-100 text-accent" : "text-ink-600 hover:text-ink-400",
                  ].join(" ")}
                  title={isBookmarked ? "Remove bookmark" : "Add bookmark"}
                >
                  {isBookmarked ? "★" : "☆"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
