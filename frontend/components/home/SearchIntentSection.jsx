import Link from "next/link";
import { ArrowRight, Home, Plane, Users } from "lucide-react";

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

        <div className="mt-10 text-center">
          <Link href="/register" className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-black transition-transform hover:scale-[1.03]">
            Start splitting for free <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
