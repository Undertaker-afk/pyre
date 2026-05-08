import { useEffect } from "react";
import { useWorkspace } from "@/store/workspace";
import { MonacoView } from "./MonacoView";
import { GraphView } from "./GraphView";

export function DecompilerTabs() {
  const tabs = useWorkspace((s) => s.tabs);
  const focused = useWorkspace((s) => s.focusedAddr);
  const focusedType = useWorkspace((s) => s.focusedType);
  const focusTab = useWorkspace((s) => s.focusTab);
  const openTab = useWorkspace((s) => s.openTab);
  const closeTab = useWorkspace((s) => s.closeTab);

  // Cmd+W / Ctrl+W to close, Cmd+1..9 to focus tab N. Bound at the
  // window so they fire even when Monaco has focus.
  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      const meta = ev.metaKey || ev.ctrlKey;
      if (!meta) return;
      if (ev.key === "w" && focused != null) {
        ev.preventDefault();
        closeTab(focused);
      } else if (ev.key >= "1" && ev.key <= "9") {
        const idx = parseInt(ev.key, 10) - 1;
        const t = tabs[idx];
        if (t) {
          ev.preventDefault();
          focusTab(t.addr, t.type);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tabs, focused, closeTab, focusTab]);

  if (tabs.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-ink-500 text-sm">
        Pick a function from the sidebar to start decompiling.
      </div>
    );
  }

  const focusedTab = tabs.find(
    (t) => t.addr === focused && t.type === focusedType,
  );

  return (
    <div className="h-full flex flex-col bg-ink-950">
      <div className="flex border-b border-ink-800 overflow-x-auto bg-ink-900 shrink-0">
        {tabs.map((t, idx) => {
          const isFocused = t === focusedTab;
          return (
            <div
              key={`${t.addr.toString()}:${t.type}:${idx}`}
              className={[
                "group flex items-center gap-2 pl-3 pr-1.5 py-1.5 text-xs font-mono cursor-pointer",
                "border-r border-ink-800",
                isFocused
                  ? "bg-ink-950 text-white border-b-2 border-b-accent"
                  : "text-ink-400 hover:text-ink-200 hover:bg-ink-850",
              ].join(" ")}
              onClick={() => focusTab(t.addr, t.type)}
              onAuxClick={(e) => {
                if (e.button === 1) closeTab(t.addr);
              }}
            >
              <span className="truncate max-w-[16ch]" title={t.name}>
                {t.name} {t.type === "graph" ? "(graph)" : ""}
              </span>
              {t.loading && (
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              )}
              {isFocused && (
                <button
                  className="opacity-50 hover:opacity-100 text-[10px] bg-ink-800 px-1 rounded border border-ink-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    openTab(t.addr, t.type === "code" ? "graph" : "code");
                  }}
                  title={t.type === "code" ? "View Graph" : "View Code"}
                >
                  {t.type === "code" ? "G" : "C"}
                </button>
              )}
              <button
                className="opacity-50 group-hover:opacity-100 hover:text-red-400"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(t.addr, t.type);
                }}
                title="Close tab"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        {focusedTab?.type === "code" ? (
          <MonacoView tab={focusedTab} />
        ) : focusedTab?.type === "graph" ? (
          <GraphView addr={focusedTab.addr} />
        ) : null}
      </div>
    </div>
  );
}
