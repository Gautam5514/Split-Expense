"use client";

import { useState, useMemo } from "react";
import {
  HelpCircle, Search, ChevronDown, ChevronUp,
  Rocket, Users, SplitSquareHorizontal, Wallet,
  Settings, Headphones, Mail, BookOpen
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const FAQ_SECTIONS = [
  {
    id: "getting-started",
    icon: <Rocket size={16} className="text-cyan-600 dark:text-cyan-400" />,
    title: "Getting Started",
    questions: [
      {
        q: "How do I create a group?",
        a: "Click 'Create Group' on the dashboard. You will be prompted to enter a group name and choose a default currency. Once created, you can start adding members.",
      },
      {
        q: "How do I invite members?",
        a: "Open any group and click 'Add Members'. You can search by name or email for registered users, or enter any email address to send an invitation link. Non-registered users will receive an email with a join link.",
      },
      {
        q: "How do I join a group via invite link?",
        a: "Click the invite link you received. If you're already signed in, you'll be added to the group instantly. If not, you'll be prompted to sign in or register - your invite is remembered and applied after you authenticate.",
      },
    ],
  },
  {
    id: "managing-groups",
    icon: <Users size={16} className="text-cyan-600 dark:text-cyan-400" />,
    title: "Managing Groups",
    questions: [
      {
        q: "How do I add expenses to a group?",
        a: "Inside a group, click the '+ Add Expense' button. Fill in the description, amount, who paid, and the split method (equal, ratio, or exact). The balances update instantly for all members.",
      },
      {
        q: "Can I remove a member from a group?",
        a: "Yes. As the group creator, open the group's Members section and click the remove icon next to any member. Members with pending balances will need to settle first.",
      },
      {
        q: "How do I mark a trip as completed?",
        a: "On the dashboard, click 'Mark as Completed' on any active group card. Completed trips move to the Completed tab and are locked from further edits.",
      },
    ],
  },
  {
    id: "splitting",
    icon: <SplitSquareHorizontal size={16} className="text-cyan-600 dark:text-cyan-400" />,
    title: "Splitting Expenses",
    questions: [
      {
        q: "What split methods are available?",
        a: "SplitEase supports three methods: Equal Split (divided evenly among all members), Ratio Split (split by custom percentages that add up to 100%), and Exact Amounts (you manually enter what each person owes).",
      },
      {
        q: "What does 'Exact Split' mean?",
        a: "Exact Split lets you specify the precise amount each member owes for an expense. This is useful when people ordered different items and owe different amounts.",
      },
    ],
  },
  {
    id: "balances",
    icon: <Wallet size={16} className="text-cyan-600 dark:text-cyan-400" />,
    title: "Balances & Settlements",
    questions: [
      {
        q: "How are balances calculated?",
        a: "SplitEase sums up all expenses in a group and calculates the net amount each person paid versus their share. A positive balance means others owe you; a negative balance means you owe others.",
      },
      {
        q: "What are Smart Settlements?",
        a: "Smart Settlements minimize the number of transactions needed to settle all debts. Instead of everyone paying everyone else, SplitEase finds the optimal set of transfers to clear all balances.",
      },
      {
        q: "How do I record a payment?",
        a: "In the Settlements section of a group, click 'Record Payment' next to a debt. Enter the amount paid and confirm. The balances update immediately for all group members.",
      },
    ],
  },
  {
    id: "account",
    icon: <Settings size={16} className="text-cyan-600 dark:text-cyan-400" />,
    title: "Account & Settings",
    questions: [
      {
        q: "How do I change my currency?",
        a: "Go to Settings → System Preferences → Default Currency. Select your preferred currency from the dropdown. This affects how amounts are displayed across your dashboard.",
      },
      {
        q: "How do I delete my account?",
        a: "Go to Settings → Account Safety → Delete Account Permanently. You'll be asked to type DELETE to confirm. This will remove all your data including groups you created, expenses, messages, and your profile.",
      },
    ],
  },
];

export default function HelpPage() {
  const [query, setQuery]       = useState("");
  const [openItem, setOpenItem] = useState({ section: "getting-started", index: 0 });

  const toggle = (sectionId, index) => {
    const isSame = openItem?.section === sectionId && openItem?.index === index;
    setOpenItem(isSame ? null : { section: sectionId, index });
  };

  // Filter sections/questions by search query
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FAQ_SECTIONS;
    return FAQ_SECTIONS.map((section) => ({
      ...section,
      questions: section.questions.filter(
        (item) => item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q)
      ),
    })).filter((s) => s.questions.length > 0);
  }, [query]);

  return (
    <div className="min-h-screen bg-background pt-8 pb-28 sm:pb-20 px-3 sm:px-4">
      <div className="max-w-xl mx-auto space-y-5">

        {/* Header */}
        <div className="text-center space-y-2 pt-2">
          <div className="w-14 h-14 rounded-full border-2 border-cyan-600/40 bg-card flex items-center justify-center mx-auto shadow-sm">
            <HelpCircle size={26} className="text-cyan-600 dark:text-cyan-400" />
          </div>
          <h1 className="text-2xl font-extrabold text-foreground">Help Center</h1>
          <p className="text-sm text-muted-foreground">Find answers to common questions</p>
        </div>

        {/* Search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for help topics..."
              className="w-full bg-card border border-border rounded pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition shadow-sm"
            />
          </div>
          <button
            type="button"
            className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-bold rounded transition cursor-pointer shadow-sm shrink-0"
          >
            Search
          </button>
        </div>

        {/* FAQ Sections */}
        {filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-10 text-center shadow-sm">
            <HelpCircle size={32} className="mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm font-semibold text-foreground mb-1">No results found</p>
            <p className="text-xs text-muted-foreground">Try different keywords or browse sections below.</p>
          </div>
        ) : (
          filtered.map((section) => (
            <div
              key={section.id}
              className="bg-card border border-border rounded-xl shadow-sm overflow-hidden"
            >
              {/* Section header */}
              <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border">
                {section.icon}
                <h2 className="text-sm font-bold text-foreground">{section.title}</h2>
              </div>

              {/* Questions */}
              <div className="divide-y divide-border">
                {section.questions.map((item, idx) => {
                  const isOpen = openItem?.section === section.id && openItem?.index === idx;
                  return (
                    <div key={idx}>
                      <button
                        type="button"
                        onClick={() => toggle(section.id, idx)}
                        className="w-full flex items-center justify-between px-5 py-4 text-left text-sm font-medium text-foreground hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer"
                      >
                        <span>{item.q}</span>
                        {isOpen
                          ? <ChevronUp size={16} className="text-muted-foreground shrink-0 ml-3" />
                          : <ChevronDown size={16} className="text-muted-foreground shrink-0 ml-3" />
                        }
                      </button>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                            className="overflow-hidden"
                          >
                            <p className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">
                              {item.a}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}

        {/* Still need help CTA */}
        <div className="bg-card border border-border rounded-xl shadow-sm p-8 flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <Headphones size={22} className="text-cyan-600 dark:text-cyan-400" />
          </div>
          <div>
            <p className="text-base font-bold text-foreground">Still need help?</p>
            <p className="text-sm text-muted-foreground mt-0.5">Our support team is ready to assist you.</p>
          </div>

          <div className="flex gap-2.5 flex-wrap justify-center mt-1">
            <a
              href="mailto:support@splitease.app"
              className="flex items-center gap-1.5 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-bold rounded transition shadow-sm cursor-pointer"
            >
              <Mail size={14} />
              Email Support
            </a>
            <Link
              href="/ai"
              className="flex items-center gap-1.5 px-5 py-2.5 border border-border text-foreground text-sm font-semibold rounded hover:bg-muted transition cursor-pointer"
            >
              <BookOpen size={14} />
              View Documentation
            </Link>
          </div>

          <p className="text-xs text-muted-foreground mt-1">support@splitease.app</p>
        </div>

      </div>
    </div>
  );
}
