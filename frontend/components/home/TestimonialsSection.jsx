"use client";

import { motion } from "framer-motion";

// SVG Brand Badges representing the user's tools/backgrounds
const VisaLogo = () => (
  <svg className="w-2.5 h-2.5 text-[#1A1F71]" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M17 4H20L15.6 20H12.6L17 4ZM9.5 4L6.5 15.2L5.3 4.8C5.2 4.3 4.8 4 4.3 4H0.2L0 4.5C1.8 5 3.3 6.2 3.8 7.8L7.1 20H10.2L14.7 4H9.5ZM24 4.5C23.6 4.2 22.8 4 22 4C20.1 4 18.7 5 18.6 6.9C18.5 9 21.2 9.1 21.1 10.7C21 11.8 19.8 12.3 18.7 12.3C17.5 12.3 16.5 11.9 16.1 11.6L15.9 11.1H12.9L13.1 11.6C13.7 12.1 15 12.8 16.8 12.8C18.9 12.8 20.3 11.8 20.4 9.9C20.5 7.6 17.8 7.5 17.9 6C18 5.2 18.8 4.7 19.8 4.7C20.6 4.7 21.4 4.9 21.8 5.2L24 4.5Z" />
  </svg>
);

const PlaidLogo = () => (
  <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 2H22V22H2V2Z" fill="black" />
    <path d="M6 6H18V10H6V6ZM6 14H18V18H6V14Z" fill="white" />
  </svg>
);

const AirbnbLogo = () => (
  <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C11.5 2 11.1 2.2 10.8 2.6L2.3 16.1C2 16.6 2 17.2 2.3 17.7C2.6 18.2 3.1 18.5 3.7 18.5H7.7C8.4 18.5 9 17.9 9 17.2V14.2C9 13.5 9.6 12.9 10.3 12.9H13.7C14.4 12.9 15 13.5 15 14.2V17.2C15 17.9 15.6 18.5 16.3 18.5H20.3C20.9 18.5 21.4 18.2 21.7 17.7C22 17.2 22 16.6 21.7 16.1L13.2 2.6C12.9 2.2 12.5 2 12 2Z" />
  </svg>
);

const FigmaLogo = () => (
  <svg className="w-2.5 h-2.5" viewBox="0 0 12 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 0C1.35 0 0 1.35 0 3C0 4.65 1.35 6 3 6H6V0H3Z" fill="#F24E1E" />
    <path d="M9 0C7.35 0 6 1.35 6 3V6H9C10.65 6 12 4.65 12 3C12 1.35 10.65 0 9 0Z" fill="#FF7262" />
    <path d="M6 6H3C1.35 6 0 7.35 0 9C0 10.65 1.35 12 3 12H6V6Z" fill="#A259FF" />
    <path d="M0 15C0 16.65 1.35 18 3 18C4.65 18 6 16.65 6 15V12H3C1.35 12 0 13.35 0 15Z" fill="#1ABC9C" />
    <path d="M6 6H9C10.65 6 12 7.35 12 9C12 10.65 10.65 12 9 12H6V6Z" fill="#19BCFE" />
  </svg>
);

const SlackLogo = () => (
  <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523 2.528 2.528 0 0 1-2.522-2.523 2.528 2.528 0 0 1 2.522-2.52h2.52v2.52zm1.261 0a2.528 2.528 0 0 1 2.52-2.52h5.043a2.528 2.528 0 0 1 2.522 2.52v5.043a2.528 2.528 0 0 1-2.522 2.52H8.823a2.528 2.528 0 0 1-2.52-2.52v-5.043z" fill="#36C5F0" />
    <path d="M8.823 5.043a2.528 2.528 0 0 1-2.52-2.52A2.528 2.528 0 0 1 8.823 0a2.528 2.528 0 0 1 2.52 2.522v2.52H8.823zm0 1.261a2.528 2.528 0 0 1 2.52 2.52v5.043a2.528 2.528 0 0 1-2.52 2.522H3.78a2.528 2.528 0 0 1-2.522-2.522V8.824a2.528 2.528 0 0 1 2.522-2.52h5.043z" fill="#2EB67D" />
    <path d="M18.958 8.824a2.528 2.528 0 0 1 2.52-2.522A2.528 2.528 0 0 1 24 8.824a2.528 2.528 0 0 1-2.522 2.52h-2.52v-2.52zm-1.261 0a2.528 2.528 0 0 1-2.52 2.52h-5.043a2.528 2.528 0 0 1-2.522-2.52V3.78a2.528 2.528 0 0 1 2.522-2.52h5.043a2.528 2.528 0 0 1 2.52 2.52v5.043z" fill="#ECB22E" />
    <path d="M15.177 18.958a2.528 2.528 0 0 1 2.52 2.52 2.528 2.528 0 0 1-2.52 2.522 2.528 2.528 0 0 1-2.522-2.522v-2.52h2.522zm0-1.261a2.528 2.528 0 0 1-2.522-2.52v-5.043a2.528 2.528 0 0 1 2.522-2.52h5.043a2.528 2.528 0 0 1 2.522 2.52v5.043a2.528 2.528 0 0 1-2.522 2.52h-5.043z" fill="#E01E5A" />
  </svg>
);

const UberLogo = () => (
  <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.3 14H8.7v-2.3h2.1v-3.4H8.7V8h6.6v2.3h-2.1v3.4h2.1V16z" />
  </svg>
);

const SpotifyLogo = () => (
  <svg className="w-2.5 h-2.5 text-[#1ED760]" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.565.387-.86.207-2.377-1.454-5.37-1.785-8.893-.982-.336.076-.67-.135-.746-.47-.077-.337.135-.67.472-.747 3.854-.88 7.15-.504 9.82 1.13.295.18.387.563.207.862zm1.225-2.72c-.227.367-.707.487-1.074.26-2.72-1.672-6.87-2.157-10.076-1.183-.412.125-.845-.107-.97-.52-.125-.413.108-.846.52-.97 3.666-1.112 8.237-.57 11.34 1.338.367.226.487.707.26 1.074zm.106-2.833C14.385 8.71 8.546 8.514 5.16 9.54c-.52.157-1.07-.14-1.228-.66-.158-.522.14-1.072.662-1.23 3.882-1.178 10.334-.95 14.42 1.48.47.28.623.89.344 1.358-.28.47-.892.622-1.357.343z" />
  </svg>
);

const TripAdvisorLogo = () => (
  <svg className="w-2.5 h-2.5 text-[#00AF87]" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-3.5 14c-1.38 0-2.5-1.12-2.5-2.5S7.12 11 8.5 11s2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5zm7 0c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
  </svg>
);

const TESTIMONIALS = [
  {
    quote: "We used SplitEase for a 10-day Goa trip with 6 friends. The QR invite got everyone in the group in 30 seconds. No more 'who paid for what?' arguments or complex spreadsheets that nobody ends up understanding.",
    author: "Rohan Mehta",
    role: "Travel Group Organiser",
    avatar: "RM",
    gradient: "from-cyan-500 to-blue-600",
    badgeBg: "bg-emerald-50",
    badgeLogo: <TripAdvisorLogo />,
    platform: "TripAdvisor",
  },
  {
    quote: "The OCR receipt scanning is unreal. I just point my phone at the bill and it reads the amount automatically. Saved us so much time at restaurants and grocery stores.",
    author: "Priya Sharma",
    role: "Frequent Traveler",
    avatar: "PS",
    gradient: "from-teal-500 to-emerald-600",
    badgeBg: "bg-blue-50",
    badgeLogo: <VisaLogo />,
    platform: "Visa",
  },
  {
    quote: "The AI assistant figured out that two of us owed each other money across different groups and suggested a single net settlement. That's genuinely smart. It saves so many awkward follow-up chats and net bank transfers.",
    author: "Aditya Kulkarni",
    role: "Office Trip Coordinator",
    avatar: "AK",
    gradient: "from-sky-500 to-indigo-600",
    badgeBg: "bg-slate-900",
    badgeLogo: <PlaidLogo />,
    platform: "Plaid",
  },
  {
    quote: "I travel solo a lot but meet up with people along the way. SplitEase makes it incredibly simple to create temporary split groups. Highly recommend the multi-currency support - it converted INR, USD and EUR without any manual input.",
    author: "Sneha Gupta",
    role: "Backpacker & Nomad",
    avatar: "SG",
    gradient: "from-rose-500 to-orange-500",
    badgeBg: "bg-rose-500",
    badgeLogo: <AirbnbLogo />,
    platform: "Airbnb",
  },
  {
    quote: "Organized our annual 25-person team retreat. SplitEase handled the complexity like a dream. The division by weights for kids vs adults was a lifesaver. Everyone was clear on their dues within minutes of the retreat ending.",
    author: "Vikram Malhotra",
    role: "HR Operations Lead",
    avatar: "VM",
    gradient: "from-purple-600 to-indigo-500",
    badgeBg: "bg-white",
    badgeLogo: <SlackLogo />,
    platform: "Slack",
  },
  {
    quote: "The visual settlement charts are beautiful. It is so easy to see the flow of money. The dark mode matches my aesthetic perfectly. Very clean UI and zero lag.",
    author: "Ananya Sen",
    role: "UI/UX Designer",
    avatar: "AS",
    gradient: "from-fuchsia-600 to-pink-500",
    badgeBg: "bg-white",
    badgeLogo: <FigmaLogo />,
    platform: "Figma",
  },
  {
    quote: "Usually, splitting bills on weekend road trips takes days of nagging in WhatsApp groups. With SplitEase, I sent a UPI payment link directly through the app, and everyone settled up before we even got back home. Absolute game-changer.",
    author: "Kabir Shah",
    role: "Weekend Explorer",
    avatar: "KS",
    gradient: "from-amber-500 to-yellow-600",
    badgeBg: "bg-black",
    badgeLogo: <UberLogo />,
    platform: "Uber",
  },
  {
    quote: "Honestly, the best expense splitter I've used. The feature to attach photos of receipts to specific expense items is super useful so everyone knows exactly what they're paying for. Simple, sleek, and fast.",
    author: "Riya Verma",
    role: "Food & Travel Blogger",
    avatar: "RV",
    gradient: "from-violet-600 to-indigo-700",
    badgeBg: "bg-black",
    badgeLogo: <SpotifyLogo />,
    platform: "Spotify",
  },
];

export default function TestimonialsSection() {
  return (
    <section className="relative py-20 sm:py-28 md:py-36 overflow-hidden bg-[#030303]">
      {/* Cinematic Ambient Glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] rounded-full bg-cyan-500/5 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] rounded-full bg-teal-500/5 blur-[120px]" />
      </div>

      <div className="relative z-10 container mx-auto max-w-7xl px-4 sm:px-6">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-16 sm:mb-24"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/[0.08] bg-white/[0.02] backdrop-blur-md mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">
              Wall of Love
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-normal text-white tracking-tight leading-tight font-serif-premium max-w-3xl mx-auto">
            Loved by thousands of <span className="italic text-cyan-400 font-serif-premium">groups</span> and <span className="italic text-teal-400 font-serif-premium">travelers</span>.
          </h2>
          <p className="mt-4 text-sm sm:text-base text-[#8A93A6] max-w-md mx-auto leading-relaxed">
            See how SplitEase is turning complex vacation balances into stress-free group settlements.
          </p>
        </motion.div>

        {/* Masonry / Bento Grid Layout */}
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 [column-fill:_balance]">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.author}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.7, delay: i * 0.08, ease: "easeOut" }}
              className="break-inside-avoid mb-6 relative group flex flex-col p-7 rounded-[22px] border border-white/[0.06] bg-[#0A0A0F]/45 backdrop-blur-xl hover:border-cyan-500/20 hover:bg-[#0E0E15]/75 hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 shadow-[0_4px_30px_rgba(0,0,0,0.5)]"
            >
              {/* Card Header (Avatar, Names, Badge) */}
              <div className="flex items-center gap-3.5">
                <div className="relative shrink-0">
                  {/* Initials Avatar with custom gradient */}
                  <div className={`w-11 h-11 rounded-full bg-gradient-to-tr ${t.gradient} flex items-center justify-center text-white text-[13px] font-extrabold tracking-wider shadow-inner`}>
                    {t.avatar}
                  </div>
                  {/* Overlapping Company Badge */}
                  <div className={`absolute -bottom-1 -right-1 w-[21px] h-[21px] rounded-full ${t.badgeBg} border border-[#0B0B0F] flex items-center justify-center shadow-md`}>
                    {t.badgeLogo}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white tracking-wide">
                    {t.author}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[11px] text-[#718096] font-medium leading-none">
                      {t.role}
                    </span>
                    <span className="w-[3px] h-[3px] rounded-full bg-white/[0.15]" />
                    <span className="text-[11px] text-[#A0AEC0] font-semibold leading-none">
                      {t.platform}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quote Content */}
              <p className="text-[#A0AEC0] text-[14.5px] leading-relaxed font-normal antialiased tracking-wide mt-5">
                &ldquo;{t.quote}&rdquo;
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
