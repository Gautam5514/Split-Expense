import McpPageClient from "@/components/mcp/McpPageClient";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://splitease.tech";

export const metadata = {
  title: "SplitEase MCP Server — Connect Claude, ChatGPT & Gemini",
  description:
    "Connect your SplitEase account to Claude, ChatGPT or Gemini with one link. Ask about balances, expenses and groups in plain language. Free, secure sign-in.",
  keywords: ["SplitEase MCP", "MCP server", "Claude connector", "ChatGPT connector", "Gemini MCP", "expense splitting AI"],
  alternates: { canonical: `${siteUrl}/mcp` },
  openGraph: {
    type: "website",
    url: `${siteUrl}/mcp`,
    title: "SplitEase MCP Server — Connect your AI assistant",
    description: "One link connects SplitEase to Claude, ChatGPT and Gemini.",
    siteName: "SplitEase",
    images: [{ url: "/logo-concept-app.svg", width: 512, height: 512, alt: "SplitEase" }],
  },
};

export default function McpPage() {
  return <McpPageClient />;
}
