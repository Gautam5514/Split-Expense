"use client";

import { useState } from "react";
import { 
  HelpCircle, ArrowLeft, BookOpen, Users, Receipt, MessageSquare, 
  Sparkles, ShieldCheck, ChevronDown, ChevronUp, Globe, Coins, ShieldAlert, Award
} from "lucide-react";
import Link from "next/link";

const CAPABILITIES = [
  {
    icon: <Users className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />,
    title: "Create Shared Group Rooms",
    desc: "Organize settlements for specific trips, roommate rentals, or group adventures. Add members with zero friction."
  },
  {
    icon: <Receipt className="w-5 h-5 text-cyan-600" />,
    title: "Split Bills & Add Expenses",
    desc: "Catalog bills into premium categories (Food, Travel, Rent, Shopping, Leisure) and instantly split them evenly or custom."
  },
  {
    icon: <Coins className="w-5 h-5 text-sky-500" />,
    title: "Visual Spending Trajectory",
    desc: "Dynamic charts (Area Trends & Donut Breakdown) analyze your settlements and display category distributions instantly."
  },
  {
    icon: <MessageSquare className="w-5 h-5 text-emerald-500" />,
    title: "Built-In Room Chats",
    desc: "Discuss settles, coordinate details, and communicate directly within each trip space with a real-time message stream."
  },
  {
    icon: <Sparkles className="w-5 h-5 text-amber-500" />,
    title: "SplitEase AI Copilot",
    desc: "Chat with a smart, context-aware AI assistant to inspect your travel spending patterns, suggest savings, or resolve debt splits."
  },
  {
    icon: <Globe className="w-5 h-5 text-cyan-500" />,
    title: "Instant Push Notifications",
    desc: "Keep up-to-date with settlements using OneSignal browser notifications that alert you the moment bills are added."
  }
];

const FAQS = [
  {
    q: "How do I create a new trip or settle group?",
    a: "Navigate to your home dashboard, enter a name (e.g. 'Goa Trip 2026') in the 'New group / trip name...' field, and click 'Add Trip'. You can instantly click into this room to manage settles!"
  },
  {
    q: "How does SplitEase calculate who owes what?",
    a: "SplitEase aggregates all expenses within a group. It automatically divides the total costs by the active members and determines the exact net balance differences, telling you exactly who should pay whom in one click."
  },
  {
    q: "How can I customize my workspace themes?",
    a: "Click your profile dropdown on the top-right and choose 'Themes'. You can toggle Light/Dark systems, select from 6 premium pre-designed templates, or customize background, text, button accent, and border colors directly with a live preview simulator."
  },
  {
    q: "Can I use SplitEase offline?",
    a: "Yes! SplitEase is built with Progressive Web App (PWA) guidelines, allowing you to load your dashboard and review active settled balances offline."
  },
  {
    q: "Is my personal budget information safe?",
    a: "Absolutely. All transactions, personal profiles, and room settles are secured behind industry-grade Firebase Authentication and tokenized APIs."
  }
];

export default function HelpPage() {
  const [activeTab, setActiveTab] = useState("guide");
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#020617] pb-20 pt-28">
      {/* Decorative Orbs */}
      <div className="absolute top-20 left-10 w-80 h-80 bg-cyan-500/10 rounded-full filter blur-[100px] pointer-events-none" />
      <div className="absolute top-40 right-20 w-96 h-96 bg-cyan-500/10 rounded-full filter blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-6 w-full">
        
        {/* Navigation Head */}
        <Link 
          href="/users" 
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer group pl-2"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to Overview
        </Link>

        {/* Headline Header */}
        <div className="flex items-start gap-4 pb-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 ring-1 ring-cyan-500/15 shrink-0 shadow-sm">
            <HelpCircle size={22} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Help Center & Documentation</h1>
            <p className="text-sm text-slate-550 dark:text-slate-400 mt-1 leading-relaxed max-w-xl font-medium">
              Welcome to SplitEase! Discover how the application simplifies shared calculations, balances expenses, and keeps group trips stress-free.
            </p>
          </div>
        </div>

        {/* ── Single Large Unified Card Shell ── */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[32px] sm:rounded-[40px] shadow-sm p-6 sm:p-10 space-y-8">
          
          {/* Tabs Control inside unified card */}
          <div className="flex p-1 rounded-full bg-slate-100 dark:bg-slate-950/20 border border-slate-200/50 dark:border-slate-800/80 max-w-lg w-full">
            <button
              onClick={() => setActiveTab("guide")}
              className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-3 px-1 sm:px-3 rounded-full text-[10px] sm:text-xs font-black transition-all cursor-pointer ${
                activeTab === "guide"
                  ? "bg-white dark:bg-slate-850 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 shadow-sm"
                  : "text-slate-500 dark:text-slate-450 hover:text-slate-800 dark:hover:text-slate-250"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              Quick Guide
            </button>
            <button
              onClick={() => setActiveTab("features")}
              className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-3 px-1 sm:px-3 rounded-full text-[10px] sm:text-xs font-black transition-all cursor-pointer ${
                activeTab === "features"
                  ? "bg-white dark:bg-slate-850 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 shadow-sm"
                  : "text-slate-500 dark:text-slate-450 hover:text-slate-800 dark:hover:text-slate-250"
              }`}
            >
              <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              Capabilities
            </button>
            <button
              onClick={() => setActiveTab("faq")}
              className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-3 px-1 sm:px-3 rounded-full text-[10px] sm:text-xs font-black transition-all cursor-pointer ${
                activeTab === "faq"
                  ? "bg-white dark:bg-slate-850 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 shadow-sm"
                  : "text-slate-500 dark:text-slate-450 hover:text-slate-800 dark:hover:text-slate-250"
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              FAQs
            </button>
          </div>

          {/* ── Tab Content 1: Quick Start Guide ── */}
          {activeTab === "guide" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 ml-1">
                <BookOpen size={18} className="text-cyan-600 dark:text-cyan-400" />
                How SplitEase Helps You
              </h3>
              
              <p className="text-sm text-slate-550 dark:text-slate-400 leading-relaxed max-w-2xl ml-1">
                We know that splitting travel and group expenses can be awkward and complicated. SplitEase is built to <strong>eliminate this friction entirely</strong>. 
                By serving as your central financial hub, the application calculates who owes what, manages settling amounts, and provides visual charts so you can travel and live stress-free.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                <div className="space-y-2.5 p-5 border border-slate-100 dark:border-slate-800/80 rounded-[20px] bg-slate-50/20 dark:bg-slate-850/10">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center font-black text-xs text-cyan-600 dark:text-cyan-400">1</div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Create a Room</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                    Name your trip or shared apartment and initialize a dedicated space for group tracking.
                  </p>
                </div>

                <div className="space-y-2.5 p-5 border border-slate-100 dark:border-slate-800/80 rounded-[20px] bg-slate-50/20 dark:bg-slate-850/10">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center font-black text-xs text-cyan-600">2</div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Add Joint Bills</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                    Log who paid for what (e.g. food, gas, or tickets). Choose custom categories and amounts.
                  </p>
                </div>

                <div className="space-y-2.5 p-5 border border-slate-100 dark:border-slate-800/80 rounded-[20px] bg-slate-50/20 dark:bg-slate-850/10">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center font-black text-xs text-sky-500">3</div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Settle Balance</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                    SplitEase does the math and suggests the simplest direct debt transactions to settle everything up.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4.5 rounded-[22px] bg-cyan-500/5 border border-cyan-500/10 text-cyan-700 dark:text-cyan-300 text-xs leading-relaxed">
                <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-cyan-600 dark:text-cyan-400 animate-pulse" />
                <p>
                  <strong>Pro Tip:</strong> Personalize your experience! Head over to your <strong>Themes</strong> panel via the top-right profile dropdown to custom design your dashboard colors and button accent configurations.
                </p>
              </div>

            </div>
          )}

          {/* ── Tab Content 2: What You Can Do ── */}
          {activeTab === "features" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 ml-1">
                <Award size={18} className="text-cyan-600 dark:text-cyan-400" />
                Core Capabilities & Features
              </h3>
              <p className="text-sm text-slate-550 dark:text-slate-400 leading-relaxed ml-1">
                Explore the rich set of modern tools available inside your SplitEase application. We have built everything you need for robust co-expense budgeting.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                {CAPABILITIES.map((feature, i) => (
                  <div 
                    key={i} 
                    className="flex gap-4 p-4.5 rounded-[20px] border border-slate-100 dark:border-slate-850/80 bg-slate-50/20 dark:bg-slate-900/10 hover:border-cyan-500/10 transition-colors"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-855 shrink-0 border border-black/[0.05]">
                      {feature.icon}
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-850 dark:text-slate-100">{feature.title}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Tab Content 3: FAQs & Support ── */}
          {activeTab === "faq" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 ml-1">
                <HelpCircle size={18} className="text-cyan-600 dark:text-cyan-400" />
                Frequently Asked Questions
              </h3>
              <p className="text-sm text-slate-550 dark:text-slate-400 leading-relaxed ml-1">
                Have questions about how SplitEase manages bills or coordinates security? Read our answers below.
              </p>

              <div className="space-y-3 pt-2">
                {FAQS.map((faq, i) => {
                  const isOpen = openFaq === i;
                  return (
                    <div 
                      key={i} 
                      className="border border-slate-100 dark:border-slate-850 rounded-[20px] overflow-hidden transition-all duration-200 bg-slate-50/30 dark:bg-slate-950/10"
                      style={{ borderColor: isOpen ? "rgba(139, 92, 246, 0.2)" : "rgba(148, 163, 184, 0.1)" }}
                    >
                      <button
                        onClick={() => toggleFaq(i)}
                        className="w-full flex items-center justify-between p-5 text-left font-extrabold text-sm text-slate-800 dark:text-slate-200 hover:text-cyan-600 dark:text-cyan-400 dark:hover:text-cyan-400 transition-colors cursor-pointer"
                      >
                        <span>{faq.q}</span>
                        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                      
                      {isOpen && (
                        <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-100/50 dark:border-slate-805/30 font-medium">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Dynamic Support CTA card inside main dashboard card */}
              <div className="p-6 border border-dashed border-cyan-500/20 rounded-[24px] bg-cyan-500/5 flex flex-col sm:flex-row items-center gap-4 justify-between mt-6">
                <div className="space-y-1 text-center sm:text-left">
                  <h4 className="text-sm font-bold text-teal-600 dark:text-cyan-300">Still have questions?</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Our SplitEase AI assistant is ready to help 24/7 with any calculations.</p>
                </div>
                <Link
                  href="/ai"
                  className="px-6 py-3.5 bg-cyan-600 hover:bg-teal-600 text-white font-extrabold text-xs rounded-full shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
                >
                  Chat with SplitEase AI
                </Link>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
