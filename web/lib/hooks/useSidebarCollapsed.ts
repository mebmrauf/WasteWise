"use client";

import * as React from "react";

const STORAGE_KEY = "wastewise:sidebar-collapsed";

/**
 * Desktop-only sidebar collapse preference, persisted across sessions.
 * Starts `false` on both server and first client render (avoids a
 * hydration mismatch) and syncs from localStorage right after mount.
 */
export function useSidebarCollapsed(): [boolean, (next: boolean) => void] {
  const [isCollapsed, setIsCollapsedState] = React.useState(false);

  React.useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "true") setIsCollapsedState(true);
  }, []);

  const setIsCollapsed = React.useCallback((next: boolean) => {
    setIsCollapsedState(next);
    window.localStorage.setItem(STORAGE_KEY, String(next));
  }, []);

  return [isCollapsed, setIsCollapsed];
}
