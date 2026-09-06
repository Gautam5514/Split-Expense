"use client";

import { motion } from "framer-motion";

// Note: testimonial cards intentionally carry no third-party company logos or
// "platform" badges - attaching a real company's brand to a quote implies an
// affiliation/endorsement we haven't verified, which is misleading.
const TESTIMONIALS = [
  {
    quote: "We used SplitEase for a 10-day Goa trip with 6 friends. The QR invite got everyone in the group in 30 seconds. No more 'who paid for what?' arguments or complex spreadsheets that nobody ends up understanding.",
    author: "Rohan Mehta",
    role: "Travel Group Organiser",
    avatar: "RM",
    gradient: "from-cyan-500 to-blue-600",
  },
  {
    quote: "The receipt photo attachment is handy. I snap a photo of the bill and it's right there on the expense so everyone can see what they're paying for. Saved us so much back-and-forth at restaurants and grocery stores.",
    author: "Priya Sharma",
    role: "Frequent Traveler",
    avatar: "PS",
    gradient: "from-teal-500 to-emerald-600",
  },
  {
    quote: "The smart settlement suggestions figured out that two of us owed each other money across different groups and suggested a single net settlement. That's genuinely smart. It saves so many awkward follow-up chats.",
    author: "Aditya Kulkarni",
    role: "Office Trip Coordinator",
    avatar: "AK",
    gradient: "from-sky-500 to-indigo-600",
  },
  {
    quote: "I travel solo a lot but meet up with people along the way. SplitEase makes it incredibly simple to create temporary split groups for a few days at a time.",
    author: "Sneha Gupta",
    role: "Backpacker & Nomad",
    avatar: "SG",
    gradient: "from-rose-500 to-orange-500",
  },
  {
    quote: "Organized our annual 25-person team retreat. SplitEase handled the complexity like a dream. The division by weights for kids vs adults was a lifesaver. Everyone was clear on their dues within minutes of the retreat ending.",
    author: "Vikram Malhotra",
    role: "HR Operations Lead",
    avatar: "VM",
    gradient: "from-purple-600 to-indigo-500",
  },
  {
    quote: "The visual settlement charts are beautiful. It is so easy to see the flow of money. The dark mode matches my aesthetic perfectly. Very clean UI and zero lag.",
    author: "Ananya Sen",
    role: "UI/UX Designer",
    avatar: "AS",
    gradient: "from-fuchsia-600 to-pink-500",
  },
  {
    quote: "Usually, splitting bills on weekend road trips takes days of nagging in WhatsApp groups. With SplitEase, we requested settlements right in the app and everyone confirmed before we even got back home. Absolute game-changer.",
    author: "Kabir Shah",
    role: "Weekend Explorer",
    avatar: "KS",
    gradient: "from-amber-500 to-yellow-600",
  },
  {
    quote: "Honestly, the best expense splitter I've used. The feature to attach photos of receipts to specific expense items is super useful so everyone knows exactly what they're paying for. Simple, sleek, and fast.",
    author: "Riya Verma",
    role: "Food & Travel Blogger",
    avatar: "RV",
    gradient: "from-violet-600 to-indigo-700",
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
              {/* Card Header (Avatar, Name, Role) */}
              <div className="flex items-center gap-3.5">
                <div className="relative shrink-0">
                  {/* Initials Avatar with custom gradient */}
                  <div className={`w-11 h-11 rounded-full bg-gradient-to-tr ${t.gradient} flex items-center justify-center text-white text-[13px] font-extrabold tracking-wider shadow-inner`}>
                    {t.avatar}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white tracking-wide">
                    {t.author}
                  </h3>
                  <span className="text-[11px] text-[#718096] font-medium leading-none">
                    {t.role}
                  </span>
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
