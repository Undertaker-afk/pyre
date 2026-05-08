import { useEffect } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useWorkspace } from "@/store/workspace";
import { FileDrop } from "@/components/FileDrop";
import { FunctionList } from "@/components/FunctionList";
import { DecompilerTabs } from "@/components/DecompilerTabs";
import { XrefsPanel } from "@/components/XrefsPanel";
import { StatusBar } from "@/components/StatusBar";
import { GlobalSearch } from "@/components/GlobalSearch";
import { HexDump } from "@/components/HexDump";
import { EntropyMap } from "@/components/EntropyMap";
import { StatsView } from "@/components/StatsView";
import { SigMaker } from "@/components/SigMaker";
import { StringAnalyzer } from "@/components/StringAnalyzer";
import { ImportExportExplorer } from "@/components/ImportExportExplorer";
import { InstructionProfiler } from "@/components/InstructionProfiler";

export function App() {
  const status = useWorkspace((s) => s.status);
  const binary = useWorkspace((s) => s.binary);
  const focusedAddr = useWorkspace((s) => s.focusedAddr);
  const setSearchOpen = useWorkspace((s) => s.setSearchOpen);
  const navigateHistory = useWorkspace((s) => s.navigateHistory);

  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      if ((ev.metaKey || ev.ctrlKey) && ev.key === "f") {
        ev.preventDefault();
        setSearchOpen(true);
      }
      if (ev.altKey && ev.key === "ArrowLeft") {
        ev.preventDefault();
        navigateHistory(-1);
      }
      if (ev.altKey && ev.key === "ArrowRight") {
        ev.preventDefault();
        navigateHistory(1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setSearchOpen, navigateHistory]);

  // Show the drop zone until a binary is fully ready. The "loading"
  // state still renders FileDrop with a busy indicator so the user
  // sees feedback while the wasm boots + spec mounts complete.
  const showDrop = status !== "ready" || !binary;

  return (
    <div className="h-screen flex flex-col">
      <div className="flex-1 min-h-0">
        {showDrop ? (
          <FileDrop />
        ) : (
          <>
            <PanelGroup direction="horizontal">
              <Panel defaultSize={18} minSize={12} maxSize={32}>
                <FunctionList />
              </Panel>
              <PanelResizeHandle className="w-px bg-ink-800" />
              <Panel defaultSize={60} minSize={30}>
                <DecompilerTabs />
              </Panel>
              <PanelResizeHandle className="w-px bg-ink-800" />
              <Panel defaultSize={22} minSize={14} maxSize={36}>
                <PanelGroup direction="vertical">
                  <Panel defaultSize={50} minSize={20}>
                    <XrefsPanel />
                  </Panel>
                  <PanelResizeHandle className="h-px bg-ink-800" />
                  <Panel defaultSize={50} minSize={20}>
                    <div className="h-full flex flex-col bg-ink-900 border-l border-ink-800">
                      <div className="px-3 py-2 border-b border-ink-800 text-xs uppercase tracking-wide text-ink-500 font-bold">
                        Analysis & Hex
                      </div>
                      <div className="flex-1 overflow-auto">
                        <div className="p-2 space-y-4">
                          <EntropyMap />
                          <StatsView />
                          <SigMaker addr={focusedAddr} />
                          <ImportExportExplorer />
                          <StringAnalyzer />
                          <InstructionProfiler />
                        </div>
                        <div className="h-64 border-t border-ink-800">
                          <HexDump focusedAddr={focusedAddr} />
                        </div>
                      </div>
                    </div>
                  </Panel>
                </PanelGroup>
              </Panel>
            </PanelGroup>
            <GlobalSearch />
          </>
        )}
      </div>
      <StatusBar />
    </div>
  );
}
