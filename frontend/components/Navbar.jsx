"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  LogOut,
  Moon,
  Sun,
  User,
  ChevronDown,
  Home,
  PlusCircle,
  Split,
  MessageCircle,
  MessageCircleMore,
  Bot,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import useTheme from "@/hooks/useTheme";
import { useNotifications } from "@/context/NotificationContext";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebaseClient"; 

export default function Navbar() {
  const router = useRouter();
  const { token, setToken } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const {
    notifications,
    hasUnread,
    setHasUnread,
    markAllAsRead,
    markOneAsRead,
  } = useNotifications();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [user, setUser] = useState(null);


  const notifRef = useRef(null);
  const profileRef = useRef(null);
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth); // ✅ Proper Firebase logout
      setToken(null);
      localStorage.removeItem("token");
      setDropdownOpen(false);
      router.push("/login");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const isLoggedIn = !!token;

  // 🧠 Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notifRef.current &&
        !notifRef.current.contains(event.target) &&
        profileRef.current &&
        !profileRef.current.contains(event.target)
      ) {
        setNotifOpen(false);
        setDropdownOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-900/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-800 text-white transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-5 py-3">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold text-xl text-emerald-400 hover:text-emerald-300 transition-all"
        >
          💸 SplitWise+
        </Link>

        {/* Nav Links */}
        {isLoggedIn ? (
          <div className="hidden sm:flex items-center gap-6 text-sm font-medium">
            <Link
              href="/users"
              className="hover:text-emerald-400 flex items-center gap-1 transition"
            >
              <Home size={16} /> Home
            </Link>
            <Link
              href="/dashboard"
              className="hover:text-indigo-400 flex items-center gap-1 transition"
            >
              <PlusCircle size={16} /> Create Group
            </Link>
            <Link
              href="/chat"
              className="hover:text-indigo-400 flex items-center gap-1 transition"
            >
              <MessageCircle size={16} /> Messages
            </Link>
            <Link
              href="/groupchat"
              className="hover:text-indigo-400 flex items-center gap-1 transition"
            >
              <MessageCircleMore size={16} /> Group Messages
            </Link>
            <Link
              href="/ai"
              className="hover:text-indigo-400 flex items-center gap-1 transition"
            >
              <Bot size={16} /> AI Mode
            </Link>
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-4">
            <Link
              href="/login"
              className="hover:text-emerald-400 transition font-medium"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
            >
              Sign Up
            </Link>
          </div>
        )}

        {/* Right Controls */}
        {/* ✅ Right Controls */}
        <div className="flex items-center gap-4">
          {/* 🔔 Notifications */}
          {isLoggedIn && (
            <div className="relative" ref={notifRef}>
              <button
                className="relative text-gray-400 hover:text-white transition"
                onClick={() => {
                  setNotifOpen((prev) => !prev);
                  setHasUnread(false);
                }}
                title="Notifications"
              >
                <Bell size={20} />
                {hasUnread && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
                )}
              </button>

              {/* 🔽 Notification Dropdown */}
              {notifOpen && (
                <div className="absolute right-0 mt-3 w-80 bg-gray-900 border border-gray-800 rounded-xl shadow-xl py-2 z-50 overflow-hidden">
                  {/* Header */}
                  <div className="flex justify-between items-center px-4 pb-2 border-b border-gray-800">
                    <h4 className="text-sm font-semibold text-gray-300">
                      Notifications
                    </h4>
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-emerald-400 hover:text-emerald-300"
                    >
                      Clear
                    </button>
                  </div>

                  {/* List */}
                  {notifications.length === 0 ? (
                    <p className="text-gray-500 text-sm px-4 py-3 text-center">
                      No new notifications
                    </p>
                  ) : (
                    <ul className="max-h-64 overflow-y-auto custom-scrollbar relative">
                      {notifications.slice(0, 8).map((n, i) => (
                        <li
                          key={i}
                          onClick={() => {
                            markOneAsRead(n._id); // ✅ Mark as read in DB
                            router.push(n.link || "/dashboard");
                            setNotifOpen(false);
                          }}
                          className="px-4 py-3 text-sm text-gray-200 hover:bg-gray-800/70 cursor-pointer border-b border-gray-800/40 last:border-none transition-all"
                        >
                          <div className="flex flex-col">
                            <span className="mb-1 leading-snug">
                              {n.type === "expense" ? "💸" : "👥"} {n.message}
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(n.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </li>
                      ))}

                      {/* Gradient fade bottom */}
                      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-900 to-transparent" />
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 🌗 Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="text-gray-400 hover:text-white transition"
            aria-label="Toggle dark mode"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* 👤 Profile Menu */}
          {isLoggedIn && (
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setDropdownOpen((p) => !p)}
                className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition"
              >
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="Profile"
                    className="w-8 h-8 rounded-full border border-gray-700 object-cover"
                  />
                ) : (
                  <User size={18} />
                )}
                <ChevronDown
                  size={14}
                  className={`transition-transform ${
                    dropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-3 w-44 bg-gray-900 border border-gray-800 rounded-lg shadow-xl py-1 text-sm z-50">
                  <Link
                    href="/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="block px-4 py-2 hover:bg-gray-800 text-gray-200"
                  >
                    Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-gray-800 hover:text-red-300 transition-all"
                  >
                    <LogOut size={14} /> Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 📱 Mobile Menu */}
      {isLoggedIn ? (
        <div className="sm:hidden border-t border-gray-800 flex justify-around py-2 bg-gray-950/60">
          <Link
            href="/dashboard"
            className="flex flex-col items-center text-xs text-gray-400 hover:text-emerald-400"
          >
            <Home size={18} /> Home
          </Link>
          <Link
            href="/create-group"
            className="flex flex-col items-center text-xs text-gray-400 hover:text-indigo-400"
          >
            <PlusCircle size={18} /> Group
          </Link>
          <Link
            href="/split"
            className="flex flex-col items-center text-xs text-gray-400 hover:text-pink-400"
          >
            <Split size={18} /> Split
          </Link>
        </div>
      ) : (
        <div className="sm:hidden border-t border-gray-800 flex justify-around py-2 bg-gray-950/60">
          <Link href="/login" className="text-sm text-emerald-400">
            Login
          </Link>
          <Link href="/register" className="text-sm text-indigo-400">
            Signup
          </Link>
        </div>
      )}
    </nav>
  );
}
