"use client";

import { useEffect, useState } from "react";

/**
 * Wrap your existing navbar with this:
 *   <HideOnScrollNav> <YourNavbar /> </HideOnScrollNav>
 * Scroll DOWN → navbar slides up & hides. Scroll UP → slides back in.
 */
export default function HideOnScrollNav({ children }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        // hide only after 80px and only while moving down
        setHidden(y > last && y > 80);
        last = y;
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`fixed inset-x-0 top-0 z-50 transition-transform duration-300 ease-out ${
        hidden ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      {children}
    </div>
  );
}
