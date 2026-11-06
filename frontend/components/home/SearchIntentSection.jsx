"use client";

import SectionHeading from "./SectionHeading";

import Link from "next/link";
import { motion } from "framer-motion";
import Image from "next/image";
import { ArrowRight, Briefcase, Home, Plane } from "lucide-react";
import { PlayStoreButton } from "@/components/PlayStoreLink";

/* "Made for sharing": three tall scenario cards. Each one is a soft cyan
   gradient backdrop with a title, a one-line promise, a "Learn more" pill and
   a SplitEase group card peeking in from the bottom, showing what that
   scenario actually looks like in the app. */

const CARDS = [
  {
    key: "trips",
    Icon: Plane,
    title: "Trips",
    desc: "Every flight, cab and dinner in one place, settled once when you're back",
    tint: ["#0891B2", "#164E63"],
    photo: {
      src: "/onboarding-trips.webp",
      alt: "Four friends taking a selfie in the sea at a Goa beach sunset",
    },
  },
  {
    key: "home",
    Icon: Home,
    title: "Flatmates",
    desc: "Rent, wifi and groceries split the same way every month, automatically",
    tint: ["#0F766E", "#134E4A"],
    photo: {
      src: "/onboarding-roommates.webp",
      alt: "Flatmates relaxing together at home",
    },
  },
  {
    key: "work",
    Icon: Briefcase,
    title: "Teams",
    desc: "Snap the receipt, split it with partners, hand accounts a clean report",
    tint: ["#06B6D4", "#155E75"],
    photo: {
      src: "/onboarding-business.webp",
      alt: "Colleagues reviewing shared expenses on a tablet at a conference",
    },
  },
];

export default function SearchIntentSection() {
  return (
    <section
      className="relative overflow-hidden bg-[#030303] px-5 py-24 text-white sm:px-8 sm:py-32"
      aria-labelledby="expense-use-cases"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <SectionHeading eyebrow="Made for sharing" title="Split the bill." secondary="Keep the friends." description="Goa trips, flat rent, team lunches. SplitEase keeps one clear record of who paid, who owes, and what's left to settle, so nobody has to chase anyone." id="expense-use-cases" />
        </motion.div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3 lg:gap-6">
          {CARDS.map((card, i) => (
            <ScenarioCard key={card.key} card={card} index={i} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mt-14 flex flex-wrap items-center justify-center gap-3.5 sm:mt-16"
        >
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-bold text-black transition-all hover:scale-[1.03] hover:bg-cyan-100 hover:shadow-[0_0_30px_rgba(255,255,255,0.25)]"
          >
            Start splitting for free <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <PlayStoreButton />
        </motion.div>
      </div>
    </section>
  );
}

function ScenarioCard({ card, index }) {
  const { Icon, photo } = card;
  const [c1, c2] = card.tint;

  return (
    <motion.article
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.65, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
      className="relative flex min-h-[560px] flex-col overflow-hidden rounded-[28px] p-6 sm:p-8"
      style={{
        background: `radial-gradient(110% 65% at 25% 0%, ${c1}99 0%, transparent 65%), radial-gradient(80% 55% at 100% 100%, ${c2}80 0%, transparent 70%), linear-gradient(180deg, ${c2}b3 0%, #07161a 100%)`,
      }}
    >
      {/* copy */}
      <div className="relative">
        <div className="flex items-center justify-between">
          <h3 className="text-[1.9rem] font-semibold tracking-[-0.03em] text-white sm:text-[2.1rem]">{card.title}</h3>
          <span className="grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-white/10 text-white/90 backdrop-blur">
            <Icon className="h-4.5 w-4.5" aria-hidden="true" />
          </span>
        </div>
        <p className="mt-3 max-w-[22rem] text-[15px] leading-relaxed text-white/75">{card.desc}</p>
      </div>

      {/* photo in a layered frame: soft outer frame, raised inner panel */}
      <div className="relative mt-auto pt-10">
        <div className="rounded-[22px] border border-white/25 bg-white/[0.07] p-2 backdrop-blur-sm">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[16px] shadow-[0_18px_40px_-14px_rgba(0,0,0,0.85)] ring-1 ring-white/10">
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              sizes="(min-width: 768px) 30vw, 90vw"
              className="object-cover object-[50%_30%]"
            />
          </div>
        </div>
      </div>
    </motion.article>
  );
}
