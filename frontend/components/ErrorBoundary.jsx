"use client";
import { Component } from "react";

// A crash in any child (a provider effect, a page render) normally unmounts the
// whole React tree and leaves a blank page with only a console error - terrible
// for an entry point. This boundary catches those errors and shows a recovery
// screen instead of a blank one.
//
// ChunkLoadError gets special treatment: it means the open tab is referencing
// JS chunk files from a previous server build (dev-server restart or a fresh
// production deploy). The code itself is fine - only a full reload can fetch
// HTML that points at the current chunks - so we reload automatically instead
// of showing the user an error for something a refresh always fixes.

const isChunkError = (err) =>
  err?.name === "ChunkLoadError" ||
  /ChunkLoadError|Loading chunk [^ ]+ failed|Failed to load chunk|error loading dynamically imported module|Importing a module script failed/i.test(
    err?.message || ""
  );

const RELOAD_STAMP_KEY = "splitease-chunk-reload-at";

// Reload at most once per 30s window. If chunks are still broken after a
// reload (server actually down, real 404), fall through to the error screen
// instead of reload-looping.
function reloadOnceForStaleChunks() {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_STAMP_KEY) || 0);
    if (Date.now() - last < 30_000) return false;
    sessionStorage.setItem(RELOAD_STAMP_KEY, String(Date.now()));
  } catch {
    // sessionStorage unavailable - reload anyway, worst case the guard is lost
  }
  window.location.reload();
  return true;
}

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, reloading: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("App crashed:", error, info);
    if (isChunkError(error) && reloadOnceForStaleChunks()) {
      this.setState({ reloading: true });
    }
  }

  componentDidMount() {
    // Chunk loads triggered outside React rendering (router prefetch, a
    // dynamic import inside an onClick) reject a promise instead of throwing
    // during render, so the boundary above never sees them.
    window.addEventListener("unhandledrejection", this.handleRejection);
  }

  componentWillUnmount() {
    window.removeEventListener("unhandledrejection", this.handleRejection);
  }

  handleRejection = (event) => {
    if (isChunkError(event.reason) && reloadOnceForStaleChunks()) {
      event.preventDefault();
      this.setState({ reloading: true });
    }
  };

  handleReload = () => {
    this.setState({ hasError: false });
    if (typeof window !== "undefined") window.location.reload();
  };

  render() {
    if (this.state.reloading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] text-white px-6">
          <p className="text-slate-400 text-sm animate-pulse">Updating to the latest version…</p>
        </div>
      );
    }

    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] text-white px-6">
        <div className="max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-5 flex items-center justify-center border border-white/10 bg-white/5 text-2xl">
            ⚠️
          </div>
          <h1 className="text-xl font-extrabold mb-2">Something went wrong</h1>
          <p className="text-slate-400 text-sm mb-6">
            The page hit an unexpected error. Reloading usually fixes it. If it
            keeps happening, please try again in a moment.
          </p>
          <button
            onClick={this.handleReload}
            className="px-5 py-3 rounded-xl font-bold text-sm text-black bg-white hover:bg-white/90 transition-all cursor-pointer"
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }
}
