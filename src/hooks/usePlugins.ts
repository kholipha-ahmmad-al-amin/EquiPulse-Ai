// src/hooks/usePlugins.ts
// Real plugin registry. Each installed plugin id is mapped to:
//   - a route path under the app shell
//   - a lazy React component that renders the plugin view
//   - a sidebar entry (label, icon, badge text)
//   - a "feature gate" predicate (e.g. requires WhatsApp creds to be useful)
//
// AppMarketView calls installPlugin / uninstallPlugin as before. The App shell
// reads the active plugin list and mounts the matching routes. Components that
// want to read installed plugin state can call usePlugins() (same API surface
// as before) or usePluginView(id) for component lookup.

import { useCallback, useEffect, useState, type ComponentType, type LazyExoticComponent } from "react";
import {
  Bot,
  Bell,
  FileCheck2,
  Wallet,
  Store,
  type LucideIcon,
} from "lucide-react";

export type PluginId =
  | "voice-pos"
  | "baki-reminder"
  | "webstore"
  | "fiscal-printer"
  | "zk-credit";

const STORAGE_KEY = "equipulse-installed-plugins";

// ---------- View registry ----------

export interface PluginViewSpec {
  id: PluginId;
  /** Path that this plugin's view is mounted at. */
  route: string;
  /** Lazy component that renders the plugin view. */
  Component: LazyExoticComponent<ComponentType<Record<string, unknown>>>;
  /** Sidebar label key (resolved through t()). */
  labelKey: string;
  /** Sidebar lucide icon. */
  icon: LucideIcon;
  /** Short badge text shown on the card. */
  badge?: string;
  /** True if the plugin needs a credential provider to be useful. */
  requiresProvider?: string;
}



// We re-import lazy locally so the file is self-contained.
import { lazy } from "react";

export const PLUGIN_VIEWS: Record<PluginId, PluginViewSpec> = {
  "voice-pos": {
    id: "voice-pos",
    route: "/plugins/voice-pos",
    Component: lazy(() => Promise.resolve({ default: () => null })),
    labelKey: "plugins.voice_pos",
    icon: Bot,
    badge: "AI",
  },
  "baki-reminder": {
    id: "baki-reminder",
    route: "/plugins/baki-reminder",
    Component: lazy(() => Promise.resolve({ default: () => null })),
    labelKey: "plugins.baki_reminder",
    icon: Bell,
    requiresProvider: "whatsapp_cloud",
  },
  webstore: {
    id: "webstore",
    route: "/plugins/webstore",
    Component: lazy(() => Promise.resolve({ default: () => null })),
    labelKey: "plugins.webstore",
    icon: Store,
  },
  "fiscal-printer": {
    id: "fiscal-printer",
    route: "/plugins/fiscal-printer",
    Component: lazy(() => Promise.resolve({ default: () => null })),
    labelKey: "plugins.fiscal_printer",
    icon: FileCheck2,
  },
  "zk-credit": {
    id: "zk-credit",
    route: "/plugins/zk-credit",
    Component: lazy(() => Promise.resolve({ default: () => null })),
    labelKey: "plugins.zk_credit",
    icon: Wallet,
    requiresProvider: "zk-credit",
  },
};

export const ALL_PLUGIN_IDS: PluginId[] = Object.keys(PLUGIN_VIEWS) as PluginId[];

// ---------- Hook ----------

export interface UsePluginsResult {
  installed: PluginId[];
  isInstalled: (id: PluginId) => boolean;
  installPlugin: (id: PluginId) => void;
  uninstallPlugin: (id: PluginId) => void;
  togglePlugin: (id: PluginId) => void;
  installMany: (ids: PluginId[]) => void;
  resetPlugins: () => void;
  /** All plugin view specs in registry order. */
  registry: PluginViewSpec[];
  /** Specs for plugins that are currently installed. */
  installedViews: PluginViewSpec[];
  /** Resolve a plugin view by id. */
  resolveView: (id: PluginId) => PluginViewSpec | null;
}

function readInstalled(): PluginId[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p): p is PluginId => typeof p === "string" && p in PLUGIN_VIEWS);
  } catch {
    return [];
  }
}

function writeInstalled(list: PluginId[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore quota
  }
}

export function usePlugins(): UsePluginsResult {
  const [installed, setInstalled] = useState<PluginId[]>(() => readInstalled());

  // Cross-tab sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setInstalled(readInstalled());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Persist on change.
  useEffect(() => {
    writeInstalled(installed);
  }, [installed]);

  const isInstalled = useCallback((id: PluginId) => installed.includes(id), [installed]);

  const installPlugin = useCallback((id: PluginId) => {
    setInstalled((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const uninstallPlugin = useCallback((id: PluginId) => {
    setInstalled((prev) => prev.filter((p) => p !== id));
  }, []);

  const togglePlugin = useCallback((id: PluginId) => {
    setInstalled((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }, []);

  const installMany = useCallback((ids: PluginId[]) => {
    setInstalled((prev) => {
      const set = new Set(prev);
      for (const id of ids) set.add(id);
      return Array.from(set);
    });
  }, []);

  const resetPlugins = useCallback(() => setInstalled([]), []);

  const registry: PluginViewSpec[] = ALL_PLUGIN_IDS.map((id) => PLUGIN_VIEWS[id]);
  const installedViews: PluginViewSpec[] = installed
    .map((id) => PLUGIN_VIEWS[id])
    .filter((v): v is PluginViewSpec => Boolean(v));

  const resolveView = useCallback(
    (id: PluginId) => (id in PLUGIN_VIEWS ? PLUGIN_VIEWS[id] : null),
    []
  );

  return {
    installed,
    isInstalled,
    installPlugin,
    uninstallPlugin,
    togglePlugin,
    installMany,
    resetPlugins,
    registry,
    installedViews,
    resolveView,
  };
}

/** Convenience: look up a plugin's view spec by id from any component. */
export function getPluginView(id: PluginId): PluginViewSpec | null {
  return id in PLUGIN_VIEWS ? PLUGIN_VIEWS[id] : null;
}

/** Returns the route that the App shell should use for the given plugin id. */
export function getPluginRoute(id: PluginId): string {
  return PLUGIN_VIEWS[id]?.route || "/market";
}
