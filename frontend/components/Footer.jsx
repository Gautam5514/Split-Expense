"use client";

import { Github, Heart, Linkedin, Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer className="w-full border-t border-gray-200 bg-white text-gray-600 text-md">
      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Left: Brand + Copyright */}
        <div className="text-center md:text-left space-y-1">
          <h3 className="font-semibold text-gray-800">SplitEase</h3>
          <p className="text-md text-gray-500">
            Simplifying group expenses & shared moments 💸
          </p>
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} SplitEase. All rights reserved.
          </p>
        </div>

        {/* Center: Navigation Links */}
        <div className="flex flex-wrap justify-center sm:justify-end gap-4 text-md text-gray-500">
          <a href="/about" className="hover:text-gray-800 transition">About</a>
          <a href="/team" className="hover:text-gray-800 transition">Team</a>
          <a href="/privacy" className="hover:text-gray-800 transition">Privacy</a>
          <a href="/terms" className="hover:text-gray-800 transition">Terms</a>
          <a href="/contact" className="hover:text-gray-800 transition">Contact</a>
        </div>

        {/* Right: Social Links */}
        <div className="flex justify-center sm:justify-end items-center gap-4 text-gray-500">
          <a
            href="mailto:softgpt9299@gmail.com"
            className="hover:text-gray-800 transition"
          >
            <Mail className="h-4 w-4" />
          </a>
          <a
            href="https://github.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-800 transition"
          >
            <Github className="h-4 w-4" />
          </a>
          <a
            href="https://linkedin.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-800 transition"
          >
            <Linkedin className="h-4 w-4" />
          </a>
        </div>
      </div>

      
    </footer>
  );
}
