"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  HelpCircle,
  Mail,
  Search,
  SplitSquareHorizontal,
  Users,
  Wallet,
} from "lucide-react";

const topics = [
  {
    title: "Groups and invites",
    icon: Users,
    questions: [
      {
        q: "How do I create a group?",
        a: "Go to Groups, choose Create Group, add a name, and invite members by email or link.",
      },
      {
        q: "How do invite links work?",
        a: "An invite link opens the join page. If the user is not signed in, SplitEase remembers the invite and applies it after login.",
      },
    ],
  },
  {
    title: "Expenses",
    icon: SplitSquareHorizontal,
    questions: [
      {
        q: "Which split methods are supported?",
        a: "You can split equally, by ratio, or with exact amounts for each person.",
      },
      {
        q: "Can I edit an expense?",
        a: "Open the group, find the expense, and use the available actions for that record.",
      },
    ],
  },
  {
    title: "Balances",
    icon: Wallet,
    questions: [
      {
        q: "How are balances calculated?",
        a: "SplitEase compares what each member paid with what they owe across the group.",
      },
      {
        q: "What are settlements?",
        a: "Settlements show the simplest payments needed to bring everyone back to zero.",
      },
    ],
  },
];

export default function HelpCenterPage() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState("Groups and invites-0");

  const filteredTopics = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return topics;

    return topics
      .map((topic) => ({
        ...topic,
        questions: topic.questions.filter(
          (item) =>
            item.q.toLowerCase().includes(term) ||
            item.a.toLowerCase().includes(term) ||
            topic.title.toLowerCase().includes(term)
        ),
      }))
      .filter((topic) => topic.questions.length > 0);
  }, [query]);

  return (
    <div className="min-h-screen bg-background px-4 pb-24 pt-6 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/login"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={16} />
          Back to login
        </Link>

        <section className="rounded-lg border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-600 ring-1 ring-cyan-500/20 dark:text-cyan-400">
                <HelpCircle size={24} />
              </div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-400">
                Support
              </p>
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                Help Center
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Find quick answers for groups, invite links, expense splitting, balances, and account support.
              </p>
            </div>

            <div className="relative w-full lg:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search help topics"
                className="w-full rounded-lg border border-border bg-background py-3 pl-10 pr-4 text-sm text-foreground outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-5">
          {filteredTopics.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-8 text-center shadow-sm">
              <p className="font-semibold text-foreground">No help articles found</p>
              <p className="mt-1 text-sm text-muted-foreground">Try a different keyword or contact support.</p>
            </div>
          ) : (
            filteredTopics.map((topic) => {
              const Icon = topic.icon;
              return (
                <section key={topic.title} className="rounded-lg border border-border bg-card shadow-sm">
                  <div className="flex items-center gap-3 border-b border-border px-5 py-4">
                    <Icon size={18} className="text-cyan-600 dark:text-cyan-400" />
                    <h2 className="font-bold text-foreground">{topic.title}</h2>
                  </div>

                  <div className="divide-y divide-border">
                    {topic.questions.map((item, index) => {
                      const key = `${topic.title}-${index}`;
                      const isOpen = open === key;
                      return (
                        <div key={item.q}>
                          <button
                            type="button"
                            onClick={() => setOpen(isOpen ? "" : key)}
                            className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                          >
                            {item.q}
                            <ChevronDown
                              size={16}
                              className={`shrink-0 text-muted-foreground transition-transform ${
                                isOpen ? "rotate-180" : ""
                              }`}
                            />
                          </button>
                          {isOpen && (
                            <p className="px-5 pb-5 text-sm leading-6 text-muted-foreground">
                              {item.a}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })
          )}
        </div>

        <section className="mt-6 rounded-lg border border-border bg-card p-6 text-center shadow-sm">
          <h2 className="text-lg font-bold text-foreground">Still need help?</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Send the support team your account email, group name, and a short description of the issue.
          </p>
          <Link
            href="/contact"
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-cyan-700"
          >
            <Mail size={16} />
            Contact us
          </Link>
        </section>
      </div>
    </div>
  );
}
