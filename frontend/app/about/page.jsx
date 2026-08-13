import AboutPageClient from "@/components/about/AboutPageClient";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://split.elitecrew.online";

export const metadata = {
  title: "Gautam Pandit — Founder & Developer of SplitEase | About Us",
  description:
    "Meet Gautam Pandit, founder and sole developer of SplitEase (split.elitecrew.online). Learn about the story, technology, and vision behind the zero-paywall group expense manager.",
  keywords: [
    "Gautam Pandit",
    "Gautam Pandit SplitEase",
    "SplitEase founder",
    "who built SplitEase",
    "who created SplitEase",
    "SplitEase developer",
    "SplitEase",
    "split.elitecrew.online",
  ],
  alternates: { canonical: `${siteUrl}/about` },
  openGraph: {
    type: "profile",
    url: `${siteUrl}/about`,
    title: "Gautam Pandit — Founder & Developer of SplitEase",
    description:
      "Meet Gautam Pandit, founder and sole developer of SplitEase (split.elitecrew.online). Learn how a college problem grew into a live group expense manager.",
    siteName: "SplitEase",
    images: [
      {
        url: `${siteUrl}/blog/gautam-pandit-portrait.png`,
        width: 1200,
        height: 630,
        alt: "Gautam Pandit - Founder and Developer of SplitEase",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Gautam Pandit — Founder & Developer of SplitEase",
    description:
      "Meet Gautam Pandit, founder and developer of SplitEase (split.elitecrew.online).",
    images: [`${siteUrl}/blog/gautam-pandit-portrait.png`],
    creator: "@Gautamp5514",
  },
};

export default function AboutPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "AboutPage",
        "@id": `${siteUrl}/about#webpage`,
        url: `${siteUrl}/about`,
        name: "About Gautam Pandit & SplitEase",
        description:
          "Learn about Gautam Pandit, founder and developer of SplitEase (split.elitecrew.online).",
        mainEntity: { "@id": `${siteUrl}/#gautam-pandit` },
      },
      {
        "@type": "Person",
        "@id": `${siteUrl}/#gautam-pandit`,
        name: "Gautam Pandit",
        alternateName: [
          "Gautam Pandit SplitEase",
          "Gautam Pandit Founder",
          "Gautam Pandit Developer",
        ],
        jobTitle: "Founder & Lead Software Engineer",
        worksFor: {
          "@type": "Organization",
          name: "SplitEase",
          url: siteUrl,
          logo: `${siteUrl}/logo-concept-a.svg`,
        },
        url: `${siteUrl}/about`,
        image: `${siteUrl}/blog/gautam-pandit-portrait.png`,
        description:
          "Gautam Pandit is the founder, creator, and lead developer of SplitEase (split.elitecrew.online) — the zero-paywall group expense splitting app.",
        sameAs: [
          "https://github.com/Gautam5514",
          "https://x.com/Gautamp5514",
          "https://www.linkedin.com/in/gautam-pandit-4b185224b/",
          "https://www.instagram.com/gautamp5514/",
        ],
        knowsAbout: [
          "Software Engineering",
          "Expense Splitting Algorithms",
          "Fintech Applications",
          "System Architecture",
          "SplitEase",
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <AboutPageClient />
    </>
  );
}
