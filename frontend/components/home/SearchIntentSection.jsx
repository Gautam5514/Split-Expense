"use client";

import SectionHeading from "./SectionHeading";

import Link from "next/link";
import { motion } from "framer-motion";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { PlayStoreButton } from "@/components/PlayStoreLink";

/* "Made for sharing": three tall photo cards. The photos are portrait shots
   with the people in the top half and a naturally dark lower half, so each
   card is just the photo, full bleed, with the title and one line of copy
   sitting on that dark area. No card colours, frames or icons. */

const CARDS = [
  {
    key: "trips",
    title: "Trips",
    desc: "Flights, cabs, that one dinner nobody budgeted for. Add it as you go and settle once you're home.",
    photo: {
      src: "/onboarding-trips.webp",
      alt: "Four friends taking a selfie in the sea at a Goa beach sunset",
    },
  },
  {
    key: "home",
    title: "Flatmates",
    desc: "Rent, wifi and groceries, split the same way every month. Nobody has to send the reminder.",
    photo: {
      src: "/onboarding-roommates.webp",
      alt: "Flatmates going through a bill together at home",
    },
  },
  {
    key: "work",
    title: "Teams",
    desc: "Snap the receipt, split it with whoever was there, and send accounts one tidy report.",
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
  const { photo } = card;

  return (
    <motion.article
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay: index * 0.1, ease: "easeOut" }}
      className="group relative mx-auto aspect-[2/3] w-full max-w-[26rem] overflow-hidden rounded-[28px] bg-[#0b0f14] ring-1 ring-inset ring-white/10 md:max-w-none"
    >
      <Image
        src={photo.src}
        alt={photo.alt}
        fill
        sizes="(min-width: 768px) 32vw, 90vw"
        className="object-cover object-[50%_20%] transition-transform duration-[900ms] ease-out group-hover:scale-[1.04]"
      />

      {/* scrim: keeps the copy readable where the photo is not dark enough */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/90 via-black/55 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 p-6 sm:p-7 lg:p-8">
        <h3 className="text-[1.75rem] font-semibold leading-none tracking-[-0.025em] text-white lg:text-[2rem]">{card.title}</h3>
        <p className="mt-3 max-w-[24rem] text-[15px] leading-relaxed text-white/75">{card.desc}</p>
      </div>
    </motion.article>
  );
}
