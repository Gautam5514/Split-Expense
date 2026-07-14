"use client";
import { Component } from "react";

// A crash in any child (a provider effect, a page render) normally unmounts the
// whole React tree and leaves a blank page with only a console error - terrible
// for an entry point. This boundary catches those errors and shows a recovery
// screen instead of a blank one.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("App crashed:", error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false });
    if (typeof window !== "undefined") window.location.reload();
  };

  render() {
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
