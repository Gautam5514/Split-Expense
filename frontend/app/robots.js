const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://split.elitecrew.online";

export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/login",
        "/register",
        "/reset-password",
        "/dashboard",
        "/users",
        "/profile",
        "/settings",
        "/chat",
        "/groupchat",
        "/groups/",
        "/join/",
        "/invite/",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
