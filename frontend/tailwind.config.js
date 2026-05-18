/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class", // ✅ use class-based toggle
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
