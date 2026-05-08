// Workspace state. One binary at a time; multiple decompiled functions
// kept open in tabs; a small LRU cache so re-focusing a tab is instant.

import { create } from "zustand";
import { DecompilerClient, DecompilerSession } from "@/decompiler/client";
import { parseBinary } from "@/parsers";
import type { ParsedBinary, Hex } from "@/decompiler/types";
import { resolveCall, iterCallsites } from "@/decompiler/resolveCall";

const CACHE_CAP = 64;

export interface OpenTab {
  addr: Hex;
  name: string;
  type: "code" | "graph";
  code?: string;          // populated once decompile resolves
  loading: boolean;
  error?: string;
  ms?: number;            // last decompile latency, for the status bar
}

interface WorkspaceState {
  binary: ParsedBinary | null;
  fileName: string | null;
  client: DecompilerClient | null;
  session: DecompilerSession | null;
  tabs: OpenTab[];
  focusedAddr: Hex | null;
  focusedType: "code" | "graph" | null;
  // Caller index built lazily as we decompile. Map<callee, callers[]>.
  xrefsTo: Map<string, Hex[]>;
  // Cache of decompiled C, keyed by addr-as-string (BigInt isn't a
  // valid Map-key for `===` lookups... actually it is, but using
  // strings here lets us serialize for tools).
  cache: Map<string, string>;
  cacheOrder: string[];   // LRU order, oldest first
  status: "idle" | "loading" | "ready" | "error";
  errorMessage: string | null;

  // New features state
  bookmarks: Set<string>; // addr.toString()
  history: { addr: Hex; type: "code" | "graph" }[];
  historyIdx: number;
  searchTerm: string;
  isSearchOpen: boolean;

  loadFile(file: File): Promise<void>;
  openTab(addr: Hex, type?: "code" | "graph", noHistory?: boolean): Promise<void>;
  closeTab(addr: Hex, type?: "code" | "graph"): void;
  focusTab(addr: Hex, type: "code" | "graph", noHistory?: boolean): void;
  toggleBookmark(addr: Hex): void;
  navigateHistory(delta: number): void;
  setSearchOpen(open: boolean): void;
  setSearchTerm(term: string): void;
  reset(): void;
}

function evictTo(state: { cache: Map<string, string>; cacheOrder: string[] }) {
  while (state.cacheOrder.length > CACHE_CAP) {
    const oldest = state.cacheOrder.shift()!;
    state.cache.delete(oldest);
  }
}

// Build the to-callers index opportunistically as we decompile new
// functions. resolveCall handles named symbols + Ghidra's synthetic
// FUN_<hex> / func_0x<hex> forms — without it the panel stayed empty
// for stripped binaries (every call rendered as func_0xNNN).
function indexCallers(
  code: string,
  callerAddr: Hex,
  binary: ParsedBinary,
  xrefs: Map<string, Hex[]>,
) {
  const nameToAddr = new Map<string, Hex>();
  for (const f of binary.functions) nameToAddr.set(f.name, f.addr);
  const seenInThisFn = new Set<string>();
  for (const id of iterCallsites(code)) {
    if (seenInThisFn.has(id)) continue;
    seenInThisFn.add(id);
    const callee = resolveCall(id, nameToAddr);
    if (callee == null) continue;
    if (callee === callerAddr) continue; // skip self-recursion
    const key = callee.toString();
    const existing = xrefs.get(key) ?? [];
    if (!existing.some((c) => c === callerAddr)) {
      xrefs.set(key, [...existing, callerAddr]);
    }
  }
}

export const useWorkspace = create<WorkspaceState>((set, get) => ({
  binary: null,
  fileName: null,
  client: null,
  session: null,
  tabs: [],
  focusedAddr: null,
  focusedType: null,
  xrefsTo: new Map(),
  cache: new Map(),
  cacheOrder: [],
  status: "idle",
  errorMessage: null,
  bookmarks: new Set(),
  history: [],
  historyIdx: -1,
  searchTerm: "",
  isSearchOpen: false,

  async loadFile(file: File) {
    set({
      status: "loading",
      errorMessage: null,
      searchTerm: "",
      isSearchOpen: false,
    });
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const binary = await parseBinary(bytes);

      // Tear down any previous session — we don't multi-binary in v1.
      const prev = get();
      if (prev.session) await prev.session.close().catch(() => {});
      if (prev.client) prev.client.terminate();

      const client = new DecompilerClient();
      // import.meta.env.BASE_URL is `/` in dev and `/<repo>/` under
      // a GH Pages project page — vite injects it at build time so
      // the same code works in both deployment shapes.
      const base = import.meta.env.BASE_URL;
      await client.init({
        specBaseUrl: `${base}specs/`,
        manifestUrl: `${base}specs/manifest.json`,
        arch: binary.arch,
      });
      const session = await client.open({
        languageId: binary.languageId,
        regions: binary.regions,
        symbols: binary.symbols,
        readonly: binary.readonly,
        strings: binary.strings,
      });

      set({
        binary,
        fileName: file.name,
        client,
        session,
        tabs: [],
        focusedAddr: null,
        focusedType: null,
        xrefsTo: new Map(),
        cache: new Map(),
        cacheOrder: [],
        status: "ready",
        bookmarks: new Set(),
        history: [],
        historyIdx: -1,
      });

      // Auto-open the most useful function so the user sees something
      // real instead of e.g. _mh_execute_header (which is the Mach-O
      // header struct, not code, and decompiles to halt_baddata).
      // Preference: main → _main → entry point → first function.
      const byName = (n: string) =>
        binary.functions.find((f) => f.name === n);
      const first =
        byName("main") ??
        byName("_main") ??
        (binary.entryPoint
          ? binary.functions.find((f) => f.addr === binary.entryPoint)
          : null) ??
        binary.functions[0];
      if (first) await get().openTab(first.addr);
    } catch (err) {
      set({
        status: "error",
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    }
  },

  async openTab(addr: Hex, type: "code" | "graph" = "code", noHistory = false) {
    const state = get();
    if (!state.session || !state.binary) return;

    const existing = state.tabs.find((t) => t.addr === addr && t.type === type);
    if (existing) {
      get().focusTab(addr, type, noHistory);
      return;
    }
    const fnEntry = state.binary.functions.find((f) => f.addr === addr);
    const name =
      fnEntry?.name ?? `FUN_${addr.toString(16)}`;

    const cached = state.cache.get(addr.toString());
    if (type === "code" && cached) {
      set((s) => {
        const newHistory = noHistory
          ? s.history
          : [...s.history.slice(0, s.historyIdx + 1), { addr, type }];
        return {
          tabs: [...s.tabs, { addr, name, type, code: cached, loading: false }],
          focusedAddr: addr,
          focusedType: type,
          history: newHistory,
          historyIdx: noHistory ? s.historyIdx : newHistory.length - 1,
        };
      });
      return;
    }

    if (type === "graph") {
      set((s) => {
        const newHistory = noHistory
          ? s.history
          : [...s.history.slice(0, s.historyIdx + 1), { addr, type }];
        return {
          tabs: [...s.tabs, { addr, name, type, loading: false }],
          focusedAddr: addr,
          focusedType: type,
          history: newHistory,
          historyIdx: noHistory ? s.historyIdx : newHistory.length - 1,
        };
      });
      return;
    }

    set((s) => {
      const newHistory = noHistory ? s.history : [...s.history.slice(0, s.historyIdx + 1), { addr, type }];
      return {
        tabs: [...s.tabs, { addr, name, type, loading: true }],
        focusedAddr: addr,
        focusedType: type,
        history: newHistory,
        historyIdx: noHistory ? s.historyIdx : newHistory.length - 1,
      };
    });

    const t0 = performance.now();
    try {
      const code = await state.session.decompile(addr, name);
      const ms = Math.round(performance.now() - t0);

      // Update cache (LRU).
      const cache = new Map(state.cache);
      const cacheOrder = [...state.cacheOrder];
      const key = addr.toString();
      if (type === "code") {
        cache.set(key, code);
        cacheOrder.push(key);
        evictTo({ cache, cacheOrder });
      }

      // Index callers for the xrefs panel.
      const xrefsTo = new Map(state.xrefsTo);
      indexCallers(code, addr, state.binary, xrefsTo);

      set((s) => ({
        cache,
        cacheOrder,
        xrefsTo,
        tabs: s.tabs.map((t) =>
          t.addr === addr && t.type === "code"
            ? { ...t, code, loading: false, ms }
            : t,
        ),
      }));
    } catch (err) {
      set((s) => ({
        tabs: s.tabs.map((t) =>
          t.addr === addr
            ? {
                ...t,
                loading: false,
                error: err instanceof Error ? err.message : String(err),
              }
            : t,
        ),
      }));
    }
  },

  closeTab(addr: Hex, type?: "code" | "graph") {
    const state = get();
    const idx = state.tabs.findIndex(
      (t) => t.addr === addr && (type === undefined || t.type === type),
    );
    if (idx < 0) return;
    const tab = state.tabs[idx];
    const newTabs = state.tabs.filter((_, i) => i !== idx);
    let nextFocus = state.focusedAddr;
    let nextType = state.focusedType;
    if (state.focusedAddr === addr && state.focusedType === tab.type) {
      // Prefer the tab to the left of the closed one; fall back to the right.
      const nextTab = newTabs[Math.max(0, idx - 1)];
      nextFocus = nextTab?.addr ?? null;
      nextType = nextTab?.type ?? null;
    }
    set({ tabs: newTabs, focusedAddr: nextFocus, focusedType: nextType });
  },

  focusTab(addr: Hex, type: "code" | "graph", noHistory = false) {
    set((s) => {
      if (s.focusedAddr === addr && s.focusedType === type) return s;
      const newHistory = noHistory ? s.history : [...s.history.slice(0, s.historyIdx + 1), { addr, type }];
      return {
        focusedAddr: addr,
        focusedType: type,
        history: newHistory,
        historyIdx: noHistory ? s.historyIdx : newHistory.length - 1,
      };
    });
  },

  toggleBookmark(addr: Hex) {
    set((s) => {
      const next = new Set(s.bookmarks);
      const key = addr.toString();
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return { bookmarks: next };
    });
  },

  navigateHistory(delta: number) {
    const s = get();
    const nextIdx = s.historyIdx + delta;
    if (nextIdx < 0 || nextIdx >= s.history.length) return;
    const item = s.history[nextIdx];
    set({ historyIdx: nextIdx });
    get().openTab(item.addr, item.type, true);
  },

  setSearchOpen(isSearchOpen: boolean) {
    set({ isSearchOpen });
  },

  setSearchTerm(searchTerm: string) {
    set({ searchTerm });
  },

  reset() {
    const state = get();
    if (state.session) state.session.close().catch(() => {});
    if (state.client) state.client.terminate();
    set({
      binary: null,
      fileName: null,
      client: null,
      session: null,
      tabs: [],
      focusedAddr: null,
      focusedType: null,
      xrefsTo: new Map(),
      cache: new Map(),
      cacheOrder: [],
      status: "idle",
      errorMessage: null,
      bookmarks: new Set(),
      history: [],
      historyIdx: -1,
      searchTerm: "",
      isSearchOpen: false,
    });
  },
}));
