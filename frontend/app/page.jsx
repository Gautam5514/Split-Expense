"use client";

import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-100 dark:from-zinc-900 dark:via-black dark:to-zinc-900 px-6">
      {/* Header Section */}
      <header className="flex flex-col items-center text-center mb-10">
        <h1 className="text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-4">
          SplitWise Travel
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-xl">
          Effortlessly split your travel expenses with friends. Create groups,
          add expenses, and let us calculate who owes whom — automatically.
        </p>
      </header>

      {/* Call to Action Buttons */}
      <div className="flex gap-4 mt-8">
        <button
          onClick={() => router.push("/login")}
          className="px-6 py-3 rounded-lg bg-black text-white font-semibold hover:bg-gray-800 cursor-pointer transition-all"
        >
          Login
        </button>
        <button
          onClick={() => router.push("/register")}
          className="px-6 py-3 rounded-lg border border-gray-800 text-gray-800 font-semibold hover:bg-gray-100 dark:border-gray-300 dark:text-gray-200 dark:hover:bg-zinc-800 cursor-pointer transition-all"
        >
          Register
        </button>
      </div>

      {/* Illustration / Footer */}
      <footer className="mt-20 text-center text-gray-500 dark:text-gray-400 text-sm">
        <p>Made with ❤️ by Gautam Pandit</p>
        <p className="mt-1">© {new Date().getFullYear()} SplitWise Travel</p>
      </footer>
    </div>
  );
}
