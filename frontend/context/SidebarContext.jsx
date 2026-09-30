"use client";

import { createContext, useContext, useEffect, useState } from "react";

const SidebarContext = createContext({ collapsed: false, toggleSidebar: () => {} });

// Below xl the full 248px sidebar eats too much of a tablet / small laptop
// screen, so it starts collapsed there. Expanding it on such a screen is a
// temporary choice (not persisted) - the saved preference only applies to
// wide screens.
const COMPACT_QUERY = "(max-width: 1279px)";

export function SidebarProvider({ children }) {
  const [storedCollapsed, setStoredCollapsed] = useState(false);
  const [compact, setCompact] = useState(false);
  const [compactExpanded, setCompactExpanded] = useState(false);

  useEffect(() => {
    setStoredCollapsed(localStorage.getItem("splitease-sidebar-collapsed") === "true");

    const mq = window.matchMedia(COMPACT_QUERY);
    const sync = () => {
      setCompact(mq.matches);
      setCompactExpanded(false);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const collapsed = compact ? !compactExpanded : storedCollapsed;

  const toggleSidebar = () => {
    if (compact) {
      setCompactExpanded((current) => !current);
      return;
    }
    setStoredCollapsed((current) => {
      const next = !current;
      localStorage.setItem("splitease-sidebar-collapsed", String(next));
      return next;
    });
  };

  return (
    <SidebarContext.Provider value={{ collapsed, toggleSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
}

export const useSidebar = () => useContext(SidebarContext);
