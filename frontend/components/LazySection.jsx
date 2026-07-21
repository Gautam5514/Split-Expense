"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Defer-mounts its children until the user scrolls near them.
 *
 * Combined with a `next/dynamic` import, this means a section's JS chunk is
 * NOT downloaded and the component is NOT mounted (no scroll listeners, no
 * animation loops, no canvas) until it is about to enter the viewport. This
 * keeps the initial bundle tiny and the page interactive almost instantly.
 *
 *  - `minHeight` reserves vertical space so nothing jumps as sections load.
 *  - `rootMargin` pre-loads the section a bit BEFORE it scrolls into view, so
 *    by the time the user reaches it, it is already there (feels instant).
 */
export default function LazySection({
  children,
  minHeight = "60vh",
  rootMargin = "600px 0px",
}) {
  const ref = useRef(null);
  // Always false on both server and first client render, so SSR markup and
  // hydration match. Flipped to true post-mount (see effect below).
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (show) return;

    // If IntersectionObserver is unavailable (very old browsers), render eagerly.
    if (typeof IntersectionObserver === "undefined") {
      setShow(true);
      return;
    }

    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin, show]);

  return (
    <div ref={ref} style={show ? undefined : { minHeight }}>
      {show ? children : null}
    </div>
  );
}
