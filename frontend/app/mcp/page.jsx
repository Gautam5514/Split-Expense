import McpPageClient from "@/components/mcp/McpPageClient";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://splitease.tech";

export const metadata = {
  title: "SplitEase MCP Server — Connect Claude, ChatGPT, Gemini & Grok",
  description:
    "Connect SplitEase to Claude, ChatGPT, Gemini, Grok, Cursor or any MCP app with one link. Create groups, add bills, settle up and check balances in plain language. Free, secure sign-in.",
  keywords: ["SplitEase MCP", "MCP server", "Claude connector", "ChatGPT connector", "Gemini MCP", "Grok connector", "Cursor MCP", "expense splitting AI"],
  alternates: { canonical: `${siteUrl}/mcp` },
  openGraph: {
    type: "website",
    url: `${siteUrl}/mcp`,
    title: "SplitEase MCP Server — Connect your AI assistant",
    description: "One link connects SplitEase to Claude, ChatGPT, Gemini, Grok and any MCP app.",
    siteName: "SplitEase",
    images: [{ url: "/logo-concept-app.svg", width: 512, height: 512, alt: "SplitEase" }],
  },
};

export default function McpPage() {
  return <McpPageClient />;
}
