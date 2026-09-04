import Link from "next/link";
import { ArrowRight, Home, Plane, Users } from "lucide-react";

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.kunal.splitapp";

const useCases = [
  {
    icon: Plane,
    title: "Trip expense manager",
    text: "Create one group for your trip, add flights, hotels, food and activities, then see exactly who owes whom—even when different friends paid along the way.",
  },
  {
    icon: Home,
    title: "Flat and roommate expenses",
    text: "Manage rent, electricity, groceries, internet and other household bills in one shared place. Split costs equally or choose custom shares for every flatmate.",
  },
  {
    icon: Users,
    title: "Everyday group expense splitting",
    text: "Track dinners, events and recurring shared costs without spreadsheets. SplitEase keeps a clear running balance and makes settling up simple.",
  },
];

export default function SearchIntentSection() {
  return (
    <section className="bg-black px-5 py-24 text-white sm:px-8" aria-labelledby="expense-use-cases">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-cyan-400">Built for real shared spending</p>
          <h2 id="expense-use-cases" className="text-3xl font-semibold tracking-tight sm:text-5xl">
            One expense-splitting app for trips, flats and friends
          </h2>
          <p className="mt-5 text-sm leading-7 text-white/55 sm:text-base">
            SplitEase replaces awkward calculations and scattered spreadsheets with a clear record of every payment, share and balance.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {useCases.map(({ icon: Icon, title, text }) => (
            <article key={title} className="rounded-3xl border border-white/10 bg-white/[0.035] p-7">
              <div className="mb-6 grid h-11 w-11 place-items-center rounded-2xl border border-cyan-300/15 bg-cyan-300/10 text-cyan-300">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-white/50">{text}</p>
            </article>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link href="/register" className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-black transition-transform hover:scale-[1.03]">
            Start splitting for free <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10"
          >
            <svg viewBox="30 336.7 120.9 129.2" className="h-5 w-5 shrink-0" aria-hidden="true">
              <path fill="#FFD400" d="M119.2,421.2c15.3-8.4,27-14.8,28-15.3c3.2-1.7,6.5-6.2,0-9.7c-2.1-1.1-13.4-7.3-28-15.3l-20.1,20.2L119.2,421.2z" />
              <path fill="#FF3333" d="M99.1,401.1l-64.2,64.7c1.5,0.2,3.2-0.2,5.2-1.3c4.2-2.3,48.8-26.7,79.1-43.3L99.1,401.1L99.1,401.1z" />
              <path fill="#48FF48" d="M99.1,401.1l20.1-20.2c0,0-74.6-40.7-79.1-43.1c-1.7-1-3.6-1.3-5.3-1L99.1,401.1z" />
              <path fill="#3BCCFF" d="M99.1,401.1l-64.3-64.3c-2.6,0.6-4.8,2.9-4.8,7.6c0,7.5,0,107.5,0,113.8c0,4.3,1.7,7.4,4.9,7.7L99.1,401.1z" />
            </svg>
            Get it on Google Play
          </a>
        </div>
      </div>
    </section>
  );
}
