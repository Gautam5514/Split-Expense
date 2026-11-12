"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Home, MessageCircle, MessageCircleMore, Bot,
  Bell, Search, Plus, Receipt, Settings, ChevronRight, ArrowRight, ArrowUpRight,
  CheckCircle2, PlusCircle, X, Send, PanelLeft, Moon, Hand, Split, Landmark,
  Calendar, Clock3, KeyRound, Utensils, Ticket,
  Palmtree, Pizza, Clapperboard, Plane, Beer, Mountain, Car,
  UtensilsCrossed, BedDouble, ShoppingBag, Handshake, Sparkles, Sun
} from "lucide-react";
import toast from "@/lib/toast";

// Maps semantic keys to icon components (used for groups & expenses)
const ICON_MAP = {
  trip: Palmtree,
  rent: Home,
  food: Pizza,
  movie: Clapperboard,
  plane: Plane,
  beer: Beer,
  ski: Mountain,
  car: Car,
  hotel: BedDouble,
  dining: UtensilsCrossed,
  shopping: ShoppingBag,
  settlement: Handshake,
};

const renderIcon = (key, className = "w-4 h-4") => {
  const Icon = ICON_MAP[key] || Sparkles;
  return <Icon className={className} />;
};

// Helper for currency formatting
const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

// Initial Mock Data
const INITIAL_GROUPS = [
  { id: "goa", name: "Goa Trip", icon: "trip", type: "Trip", members: ["Felix", "Priya", "Alex", "Lily"], total: 12400, color: "#0891B2", status: "active" },
  { id: "rent", name: "Monthly Rent", icon: "rent", type: "Roommates", members: ["Felix", "Lily", "Alex"], total: 45000, color: "#0E7490", status: "active" },
  { id: "lunch", name: "Office Lunch", icon: "food", type: "Business", members: ["Felix", "Priya", "Alex", "Lily", "Sam"], total: 3200, color: "#ec4899", status: "active" },
  { id: "movie", name: "Movie Night", icon: "movie", type: "Trip", members: ["Felix", "Lily", "Alex", "Priya"], total: 1800, color: "#f59e0b", status: "active" },
  { id: "diwali", name: "Diwali Dinner", icon: "dining", type: "Trip", members: ["Felix", "Priya", "Sam"], total: 0, color: "#10B981", status: "completed" },
];

const INITIAL_EXPENSES = [
  { id: "e1", groupId: "goa", name: "Hotel Booking", person: "Felix", amount: 8000, time: "2h ago", icon: "hotel", settled: false, category: "stay" },
  { id: "e2", groupId: "goa", name: "Beach Dinner", person: "Priya", amount: 2400, time: "5h ago", icon: "dining", settled: false, category: "food" },
  { id: "e3", groupId: "rent", name: "Rent Payment", person: "Alex", amount: 45000, time: "1d ago", icon: "rent", settled: false, category: "rent" },
  { id: "e4", groupId: "goa", name: "Taxi Airport", person: "Priya", amount: 1200, time: "1d ago", icon: "car", settled: true, category: "travel" },
];

const INITIAL_CHATS = {
  goa: [
    { sender: "Priya", text: "Hey! Did everyone add their shares for the villa?", time: "3h ago" },
    { sender: "Alex", text: "I think Felix paid the advance. Let me check.", time: "2h ago" },
    { sender: "Felix", text: "Yes, logged the hotel booking! Check the dashboard.", time: "1h ago" },
  ],
  rent: [
    { sender: "Lily", text: "Alex, I sent my share for this month's rent.", time: "1d ago" },
    { sender: "Alex", text: "Got it! Settle up recorded.", time: "1d ago" },
  ],
  lunch: [
    { sender: "Sam", text: "Thanks for lunch Lily! Settle up please.", time: "4h ago" },
  ],
  movie: [
    { sender: "Lily", text: "Awesome movie tonight guys!", time: "2h ago" },
  ],
  diwali: [
    { sender: "Sam", text: "All settled, thanks everyone!", time: "3d ago" },
  ],
};

const MOCK_AI_RESPONSES = {
  spend: "Across your active groups, you have spent a combined total of **₹62,400**. Your largest group expense is **Monthly Rent** (₹45,000) followed by the **Goa Trip** (₹12,400). You paid ₹8,000 for hotel booking, keeping you ahead by ₹5,400 in the Goa Trip!",
  categories: "Here is your spending analysis by category:\n- **Rent/Housing**: ₹45,000 (72%)\n- **Lodging/Stay**: ₹8,000 (13%)\n- **Dining/Food**: ₹5,600 (9%)\n- **Travel/Transport**: ₹3,000 (5%)\n- **Entertainment**: ₹1,800 (3%)\n\n*Tip: Dining costs are 12% higher than average this month!*",
  owes: "Active balances summary:\n- **Alex** owes you ₹2,600 (Goa Trip)\n- **Lily** owes you ₹2,600 (Goa Trip)\n- **Priya** owes you ₹200 (Goa Trip)\n- **You** owe **Alex** ₹15,000 (Monthly Rent)\n\nOthers owe you **₹5,400**, and you owe **₹15,000**.",
  budget: "Suggested travel budget metrics for your next trip:\n1. **Food**: 30% of total budget.\n2. **Stay**: 45% (book early to save up to 15%).\n3. **Transport/Misc**: 25%.\n\n*Recommended active target: ₹15,000 per member for a 3-day trek.*",
};

export default function InteractiveDashboardSimulator() {
  const [activeTab, setActiveTab] = useState("dashboard"); // dashboard, groups, expenses, messages, ai, group-detail
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  
  // App simulated states
  const [groups, setGroups] = useState(INITIAL_GROUPS);
  const [expenses, setExpenses] = useState(INITIAL_EXPENSES);
  const [chats, setChats] = useState(INITIAL_CHATS);
  const [activeChatGroup, setActiveChatGroup] = useState("goa");
  const [chatInput, setChatInput] = useState("");
  
  // AI assistant chat state
  const [aiMessages, setAiMessages] = useState([
    { id: "welcome", role: "ai", content: "Hello Felix! I am SplitEase AI. I can analyze your group spends, show who owes you, and compile budgets. What can I calculate for you today?" }
  ]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // Search/Filter states inside mockup
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);

  // New Group modal form
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupIcon, setNewGroupIcon] = useState("plane");

  // New Expense modal form
  const [expName, setExpName] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expGroup, setExpGroup] = useState("goa");
  const [expPayer, setExpPayer] = useState("Felix");
  const [expCategory, setExpCategory] = useState("food");

  // Settle up form
  const [settlePayer, setSettlePayer] = useState("Alex");
  const [settleAmount, setSettleAmount] = useState(2600);

  // Message chat container ref for auto scroll
  // Scroll just the message lists (desktop and phone trees both render one).
  // scrollIntoView would also scroll the landing page itself.
  const scrollListsToEnd = (kind) => {
    document.querySelectorAll(`[data-scroll-end="${kind}"]`).forEach((n) => {
      const el = n.parentElement;
      el?.scrollTo?.({ top: el.scrollHeight, behavior: "smooth" });
    });
  };

  useEffect(() => { scrollListsToEnd("chat"); }, [chats, activeChatGroup]);
  useEffect(() => { scrollListsToEnd("ai"); }, [aiMessages, aiLoading]);

  // Dynamic Spends and Balance Calculation
  const calculatedData = useMemo(() => {
    // 1. Calculate each group's total spending based on expenses
    const groupTotals = {};
    groups.forEach((g) => {
      groupTotals[g.id] = 0;
    });

    expenses.forEach((e) => {
      if (!e.settled && groupTotals[e.groupId] !== undefined) {
        groupTotals[e.groupId] += Number(e.amount);
      }
    });

    // Update group totals
    const updatedGroups = groups.map((g) => ({
      ...g,
      total: groupTotals[g.id] || 0,
    }));

    // 2. Calculate Felix's individual balances across all active groups
    // Let's assume in each group, total spending is split equally among all members.
    let totalOwed = 0;
    let totalOwe = 0;
    let totalSpentByFelix = 0;

    groups.forEach((g) => {
      const groupExpenses = expenses.filter((e) => e.groupId === g.id && !e.settled);
      if (groupExpenses.length === 0) return;

      const groupTotal = groupExpenses.reduce((sum, e) => sum + e.amount, 0);
      const share = groupTotal / g.members.length;

      // How much Felix paid
      const felixPaid = groupExpenses
        .filter((e) => e.person === "Felix")
        .reduce((sum, e) => sum + e.amount, 0);

      const balance = felixPaid - share;
      if (balance > 0) {
        totalOwed += balance;
      } else {
        totalOwe += Math.abs(balance);
      }

      totalSpentByFelix += felixPaid;
    });

    // Recorded settlements: money someone paid back (or Felix paid) reduces what is open.
    expenses.filter((e) => e.kind === "settlement").forEach((e) => {
      if (e.person === "Lily") totalOwe = Math.max(0, totalOwe - e.amount);
      else totalOwed = Math.max(0, totalOwed - e.amount);
    });

    // Return all calculated indicators
    return {
      groups: updatedGroups,
      totalSpent: totalSpentByFelix,
      youOwe: totalOwe,
      owed: totalOwed,
    };
  }, [groups, expenses]);


  // Quick Action triggers
  const triggerReminder = (name) => {
    toast.success(`Payment reminder sent to ${name}!`);
  };

  const handleCreateGroup = (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      toast.error("Please enter a group name");
      return;
    }
    const newId = `${newGroupName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now().toString(36)}`;
    const newG = {
      id: newId,
      name: newGroupName.trim(),
      icon: newGroupIcon,
      type: "Trip",
      members: ["Felix", "Priya", "Alex"],
      total: 0,
      color: ["#0891B2", "#0E7490", "#ec4899", "#f59e0b", "#10B981"][groups.length % 5],
      pct: 0,
      status: "active"
    };

    setGroups([...groups, newG]);
    setChats({ ...chats, [newId]: [] });
    setNewGroupName("");
    setShowAddGroupModal(false);
    toast.success(`Trip "${newG.name}" created!`);
  };

  const handleAddExpense = (e) => {
    e.preventDefault();
    if (!expName.trim() || !expAmount) {
      toast.error("Please fill in all fields");
      return;
    }

    const amt = Number(expAmount);
    const newE = {
      id: `e-${Date.now()}`,
      groupId: expGroup,
      name: expName.trim(),
      person: expPayer,
      amount: amt,
      time: "Just now",
      icon: expCategory === "food" ? "dining" : expCategory === "travel" ? "car" : expCategory === "stay" ? "hotel" : "shopping",
      settled: false,
      category: expCategory,
    };

    setExpenses([newE, ...expenses]);
    setExpName("");
    setExpAmount("");
    setShowAddExpenseModal(false);
    toast.success(`Expense "${newE.name}" added to group!`);
  };

  const handleRecordSettlement = (e) => {
    e.preventDefault();
    const amt = Number(settleAmount);
    const from = settlePayer;
    const to = "Felix";

    const newE = {
      id: `e-${Date.now()}`,
      groupId: selectedGroupId || "goa",
      name: `Settlement: ${from} to ${to}`,
      person: from,
      amount: amt,
      time: "Just now",
      icon: "settlement",
      settled: true,
      category: "general",
      kind: "settlement",
    };

    setExpenses([newE, ...expenses]);
    setShowSettleModal(false);
    toast.success(`Settlement of ${INR.format(amt)} recorded!`);
  };

  // Chat message send
  const handleSendChatMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMsg = {
      sender: "Felix",
      text: chatInput.trim(),
      time: "Just now",
    };

    setChats({
      ...chats,
      [activeChatGroup]: [...(chats[activeChatGroup] || []), newMsg],
    });
    setChatInput("");

    // Simulate dummy friend response after 1s
    setTimeout(() => {
      const groupData = groups.find((g) => g.id === activeChatGroup);
      const friends = groupData ? groupData.members.filter((m) => m !== "Felix") : ["Priya"];
      const responder = friends[Math.floor(Math.random() * friends.length)];
      
      const responses = [
        "Awesome! Added to my checklist.",
        "Got it, thanks Felix!",
        "Sounds good. Let me check my balances page.",
        "Nice, I'll pay my share tonight!",
        "Perfect. Splitting makes it so easy!"
      ];

      const reply = {
        sender: responder,
        text: responses[Math.floor(Math.random() * responses.length)],
        time: "Just now",
      };

      setChats((prev) => ({
        ...prev,
        [activeChatGroup]: [...(prev[activeChatGroup] || []), reply],
      }));
    }, 1200);
  };

  // Ask AI simulator
  const handleAskAI = (promptText) => {
    const text = promptText || aiInput;
    if (!text.trim() || aiLoading) return;

    const userMsg = { id: `u-${Date.now()}`, role: "user", content: text };
    setAiMessages((prev) => [...prev, userMsg]);
    setAiInput("");
    setAiLoading(true);

    setTimeout(() => {
      let replyContent = "I can analyze your balances. Try clicking one of the quick prompts or ask me about 'spending', 'owes', 'categories', or 'budget'.";
      const normalized = text.toLowerCase();

      if (normalized.includes("spend") || normalized.includes("trip") || normalized.includes("group")) {
        replyContent = MOCK_AI_RESPONSES.spend;
      } else if (normalized.includes("category") || normalized.includes("tag") || normalized.includes("summarize")) {
        replyContent = MOCK_AI_RESPONSES.categories;
      } else if (normalized.includes("owe") || normalized.includes("balance") || normalized.includes("settle")) {
        replyContent = MOCK_AI_RESPONSES.owes;
      } else if (normalized.includes("budget") || normalized.includes("plan") || normalized.includes("trek")) {
        replyContent = MOCK_AI_RESPONSES.budget;
      }

      setAiMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: "ai", content: replyContent }]);
      setAiLoading(false);
    }, 1000);
  };

  // View-level UI state
  const [groupTab, setGroupTab] = useState("active");
  const [searchOpen, setSearchOpen] = useState(false);

  const goTab = (id) => {
    setActiveTab(id);
    setSelectedGroupId(null);
  };

  // Nav Items list (matches the real app sidebar)
  const NAV_ITEMS = [
    { id: "dashboard", icon: Home, label: "Home" },
    { id: "messages", icon: MessageCircle, label: "Messages" },
    { id: "groups", icon: PlusCircle, label: "Groups" },
    { id: "chatroom", icon: MessageCircleMore, label: "Chatroom" },
    { id: "ai", icon: Bot, label: "AI" },
  ];

  const navActive = (id) => activeTab === id || (id === "groups" && activeTab === "group-detail");

  const pageTitle = {
    dashboard: "Home",
    groups: "Groups",
    "group-detail": calculatedData.groups.find((g) => g.id === selectedGroupId)?.name || "Group",
    messages: "Messages",
    chatroom: "Chatroom",
    ai: "AI",
  }[activeTab];

  return (
    <div className="w-full relative">

      {/* DESKTOP VIEWPORT CHASSIS */}
      <div className="hidden sm:block w-full rounded-2xl overflow-hidden border border-white/10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] bg-white/[0.02] backdrop-blur-xl relative select-none">

        {/* Browser top header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-white/5 backdrop-blur-md border-b border-white/10">
          <div className="flex gap-1.5 flex-shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
          </div>
          <div className="flex-1 max-w-[260px] mx-auto py-0.5 rounded-lg text-[10px] text-white/40 font-bold bg-black/40 border border-white/5 text-center truncate flex items-center justify-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-cyan-400" />
            <span>{activeTab === "groups" ? "splitease.app/dashboard" : "splitease.app/users"}</span>
          </div>
          <div className="flex gap-1.5">
            {[Bell, Settings].map((Icon, i) => (
              <button key={i} onClick={() => toast.success("Feature simulated in sandbox!")} className="w-6 h-6 rounded-md flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/80 transition">
                <Icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>
        </div>

        {/* App layout */}
        <div className="flex bg-[#050505] text-[#F5F5F5] h-[480px] tracking-[-0.01em]">

          {/* Sidebar */}
          <aside className="w-[200px] lg:w-[220px] xl:w-[248px] flex-shrink-0 flex flex-col bg-[#111111] border-r border-white/[0.06]">
            <div className="h-16 px-5 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <img src="/logo-icon-light.png" className="w-8 h-8 object-contain" alt="SplitEase" />
                <span className="text-[19px] font-medium tracking-wide">SplitEase</span>
              </div>
              <PanelLeft className="w-[18px] h-[18px] text-[#A1A1AA]" />
            </div>

            <nav className="flex flex-col gap-1.5 px-3 flex-1 pt-2">
              {NAV_ITEMS.map(({ id, icon: Icon, label }) => {
                const isActive = navActive(id);
                return (
                  <button
                    key={id}
                    onClick={() => goTab(id)}
                    className={`h-12 rounded-full px-4 flex items-center gap-3.5 text-left transition-colors cursor-pointer ${
                      isActive ? "bg-white/[0.06] text-[#F5F5F5] font-bold" : "text-[#A1A1AA] font-medium hover:bg-white/[0.035]"
                    }`}
                  >
                    <Icon className="w-[19px] h-[19px] shrink-0" strokeWidth={1.75} />
                    <span className="text-[14px] flex-1">{label}</span>
                    {isActive && <ChevronRight className="w-4 h-4 text-[#A1A1AA]" />}
                  </button>
                );
              })}
            </nav>

            <div className="p-3">
              <div className="flex items-center gap-2.5 rounded-2xl p-2 hover:bg-white/[0.035] transition-colors">
                <div className="w-9 h-9 rounded-lg bg-[#F5F5F5] text-[#050505] flex items-center justify-center font-bold text-sm shrink-0">F</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-bold truncate leading-tight">Felix Kumar</p>
                  <p className="text-[10.5px] text-[#A1A1AA] truncate">felix@gmail.com</p>
                </div>
                <button onClick={() => toast.success("Felix profile active!")} className="p-1 text-[#A1A1AA] hover:text-white">
                  <Settings className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </aside>

          {/* Main */}
          <main className="flex-1 flex flex-col min-w-0 relative overflow-hidden">

            {/* Top navbar */}
            <header className="h-16 flex items-center justify-between px-5 bg-[#111111] border-b border-white/[0.08] flex-shrink-0">
              <h2 className="text-[19px] font-bold truncate">{pageTitle}</h2>
              <div className="flex items-center gap-2">
                {searchOpen ? (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
                    <input
                      autoFocus
                      type="text"
                      placeholder="Search groups, people, expenses..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onBlur={() => { if (!searchQuery) setSearchOpen(false); }}
                      className="h-10 w-56 lg:w-72 pl-9 pr-3 rounded-full text-[13px] bg-white/[0.05] border border-cyan-500/60 outline-none text-[#F5F5F5] placeholder:text-[#A1A1AA]"
                    />
                  </div>
                ) : (
                  <button onClick={() => setSearchOpen(true)} className="w-10 h-10 rounded-full flex items-center justify-center text-[#A1A1AA] hover:bg-white/[0.06] hover:text-white transition-colors cursor-pointer">
                    <Search className="w-[18px] h-[18px]" />
                  </button>
                )}
                <button
                  onClick={() => toast.success("Dark mode is on in this demo")}
                  className="relative h-8 w-14 rounded-full border border-white/10 bg-white/[0.07] flex items-center justify-between px-[7px] cursor-pointer"
                  aria-label="Theme"
                >
                  <span className="absolute left-[5px] top-1/2 -translate-y-1/2 h-[22px] w-[22px] rounded-full bg-white shadow" />
                  <Moon className="relative w-3.5 h-3.5 text-[#050505]" />
                  <Sun className="relative w-3.5 h-3.5 text-[#A1A1AA]" />
                </button>
                <button onClick={() => toast.success("You're all caught up!")} className="relative w-10 h-10 rounded-full flex items-center justify-center text-[#A1A1AA] hover:bg-white/[0.06] hover:text-white transition-colors cursor-pointer">
                  <Bell className="w-[18px] h-[18px]" />
                  <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-[#F87171] ring-2 ring-[#111111]" />
                </button>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center text-sm font-bold text-white">FK</div>
              </div>
            </header>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar relative">
              <div className="pointer-events-none absolute -left-10 top-0 h-48 w-72 rounded-full bg-violet-500/5 blur-3xl" />
              <div className="pointer-events-none absolute right-0 top-0 h-48 w-72 rounded-full bg-cyan-500/5 blur-3xl" />
              <div className="relative p-5">
                <AnimatePresence mode="wait">
                  {activeTab === "dashboard" && renderDashboardView(calculatedData)}
                  {activeTab === "groups" && renderGroupsView(calculatedData)}
                  {activeTab === "group-detail" && renderGroupDetailView(calculatedData)}
                  {(activeTab === "messages" || activeTab === "chatroom") && renderMessagesView(false, activeTab)}
                  {activeTab === "ai" && renderAiView()}
                </AnimatePresence>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* SMARTPHONE CHASSIS FOR MOBILE */}
      <div className="block sm:hidden w-full max-w-[310px] mx-auto rounded-[36px] border-[10px] border-white/10 bg-[#050505] backdrop-blur-xl shadow-[0_30px_60px_-10px_rgba(0,0,0,0.8)] overflow-hidden select-none aspect-[9/19] flex flex-col relative">

        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-20 h-4 bg-white/10 rounded-full z-30 flex items-center justify-center border border-white/5">
          <div className="w-2.5 h-2.5 rounded-full bg-black/80 absolute right-4" />
        </div>

        <div className="h-9 pt-2.5 px-6 flex justify-between items-center text-[10px] font-bold text-white/60 bg-[#111111] border-b border-white/5 z-20">
          <span>9:41</span>
          <div className="flex gap-1">
            <span>5G</span>
            <span className="w-4 h-2.5 border border-white/40 rounded-sm bg-white/60" />
          </div>
        </div>

        <div className="flex-1 bg-[#050505] text-[#F5F5F5] overflow-y-auto custom-scrollbar flex flex-col pb-12">
          <div className="px-4 py-2 border-b border-white/5 bg-[#111111] flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <img src="/logo-icon-light.png" className="w-5 h-5 object-contain" alt="" />
              <span className="text-sm font-bold truncate">{pageTitle}</span>
            </div>
            <button
              onClick={() => (activeTab === "dashboard" || activeTab === "groups" ? setShowAddGroupModal(true) : setShowAddExpenseModal(true))}
              className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs"
            >
              +
            </button>
          </div>

          <div className="flex-1 p-3 overflow-y-auto">
            {activeTab === "dashboard" && renderDashboardView(calculatedData, true)}
            {activeTab === "groups" && renderGroupsView(calculatedData, true)}
            {activeTab === "group-detail" && renderGroupDetailView(calculatedData, true)}
            {(activeTab === "messages" || activeTab === "chatroom") && renderMessagesView(true, activeTab)}
            {activeTab === "ai" && renderAiView(true)}
          </div>
        </div>

        <div className="absolute bottom-0 inset-x-0 h-13 border-t border-white/10 bg-[#111111] flex justify-around items-center px-2 z-20">
          {NAV_ITEMS.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => goTab(id)} className={`flex flex-col items-center gap-0.5 ${navActive(id) ? "text-cyan-400" : "text-white/40"}`}>
              <Icon className="w-4 h-4" />
              <span className="text-[7.5px] font-bold">{label}</span>
            </button>
          ))}
        </div>

        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-20 h-1 bg-white/30 rounded-full z-20" />
      </div>

      {/* INTERACTIVE MODALS */}
      {showAddGroupModal && renderAddGroupModal()}
      {showAddExpenseModal && renderAddExpenseModal()}
      {showSettleModal && renderSettleModal()}
    </div>
  );

  // 1. HOME VIEW
  function renderDashboardView(data, isMobileFlow = false) {
    const activeGroups = data.groups.filter((g) => g.status !== "completed");
    const addedSpend = expenses.filter((e) => e.id.startsWith("e-") && !e.settled).reduce((s, e) => s + e.amount, 0);
    const fmt = (n) => INR.format(Math.round(n));

    return (
      <motion.div
        key="dashboard"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="space-y-6 text-left"
      >
        {/* Hero */}
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2.5">
              <Hand className="w-7 h-7 text-amber-400 -rotate-12" />
              <span className="text-[2.6rem] leading-none font-normal" style={{ fontFamily: "var(--font-satisfy), cursive" }}>Felix</span>
            </div>
            <p className="mt-2 text-sm text-slate-400">Every rupee tracked. Every balance settled.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAddExpenseModal(true)} className="h-11 px-4 rounded-xl border border-cyan-600/25 bg-cyan-500/10 text-cyan-300 text-sm font-semibold flex items-center gap-2 hover:bg-cyan-500/15 transition cursor-pointer">
              <Split className="w-4 h-4" /> Quick Split
            </button>
            <button onClick={() => setShowAddGroupModal(true)} className="h-11 px-4 rounded-xl bg-gradient-to-br from-cyan-600 to-teal-700 text-white text-sm font-semibold flex items-center gap-2 shadow-[0_8px_20px_-10px_rgba(8,145,178,0.9)] hover:brightness-110 transition cursor-pointer">
              <Plus className="w-4 h-4" /> New group
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className={`grid ${isMobileFlow ? "grid-cols-2" : "grid-cols-4"} gap-3`}>
          <StatCard icon={Users} tile="bg-blue-400/10 text-blue-300" label="Total Groups" value={String(data.groups.length)} sub={`${activeGroups.length} currently active`} />
          <StatCard icon={Calendar} tile="bg-violet-400/10 text-violet-300" label="Spent This Month" value={fmt(12450 + addedSpend)} sub="Mostly Food & Dining" />
          <StatCard icon={ArrowUpRight} tile="bg-rose-400/10 text-rose-300" label="You Have to Pay" value={fmt(data.youOwe)} valueClass="text-rose-400" sub="Pending across your groups" />
          <StatCard icon={Landmark} tile="bg-emerald-400/10 text-emerald-300" label="You're Owed" value={fmt(data.owed)} valueClass="text-emerald-400" sub="Waiting to come back to you" />
        </div>

        {/* Active Groups */}
        <section className="space-y-3">
          <SectionHeader
            icon={Users}
            tile="from-cyan-500/15 to-teal-500/10 text-[#0891B2] ring-[#0891B2]/15"
            title="Active Groups"
            subtitle="Quick access to your recent groups"
            onLink={() => goTab("groups")}
          />
          <div className={`grid ${isMobileFlow ? "grid-cols-1" : "grid-cols-2"} gap-2.5`}>
            {activeGroups.slice(0, 6).map((g, i) => {
              const [a, b] = GROUP_GRADIENTS[i % GROUP_GRADIENTS.length];
              return (
                <div
                  key={g.id}
                  onClick={() => { setSelectedGroupId(g.id); setActiveTab("group-detail"); }}
                  className="group flex items-center gap-2.5 rounded-2xl border border-[#232323]/70 bg-[#111111] p-2.5 hover:border-[#0891B2]/40 transition cursor-pointer"
                >
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 text-white" style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}>
                    {renderIcon(g.icon, "w-[18px] h-[18px]")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold truncate">{g.name}</p>
                    <p className="text-xs text-[#A1A1AA]">{g.members.length} members</p>
                  </div>
                  <AvatarStack names={g.members} size={22} max={2} text="text-[8px]" ring="ring-[#111111]" />
                  <button
                    onClick={(e) => { e.stopPropagation(); setExpGroup(g.id); setShowAddExpenseModal(true); }}
                    className="h-7 w-7 rounded-full bg-[#0891B2]/10 text-[#0891B2] flex items-center justify-center shrink-0 hover:bg-[#0891B2] hover:text-white transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <span className="h-7 w-7 rounded-full bg-[#1A1A1A]/60 text-[#A1A1AA] group-hover:bg-[#0891B2] group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Quick Splits */}
        <section className="space-y-3">
          <SectionHeader
            icon={Split}
            tile="from-cyan-500/15 to-sky-500/10 text-cyan-300 ring-cyan-500/15"
            title="Quick Splits"
            subtitle="One-off bills you split with friends"
          />
          <div className="overflow-hidden rounded-2xl border border-[#232323] bg-[#111111]">
            {QUICK_SPLITS.map((q) => (
              <div key={q.title} className="flex items-center gap-3 px-4 py-3 border-b border-[#232323]/70 last:border-b-0 hover:bg-[#1A1A1A]/50 transition">
                <div className="h-11 w-11 rounded-xl bg-cyan-500/10 text-cyan-300 flex items-center justify-center shrink-0">
                  <Split className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold truncate">{q.title}</p>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-[#A1A1AA]">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#1A1A1A] px-2 py-0.5"><Users className="w-2.5 h-2.5" />{q.people} people</span>
                    <span className="truncate">{q.name} owes you</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-extrabold">{INR.format(q.amount)}</p>
                  <button onClick={() => triggerReminder(q.name)} className="text-[11px] font-semibold text-[#0891B2] hover:underline cursor-pointer">Remind</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Activity */}
        <section className="space-y-3">
          <SectionHeader
            icon={Receipt}
            tile="from-amber-500/15 to-orange-500/10 text-amber-400 ring-amber-500/15"
            title="Recent Activity"
            subtitle="Your latest expenses across every group"
          />
          <div className="overflow-hidden rounded-2xl border border-[#232323] bg-[#111111]">
            {expenses.filter((e) => e.kind !== "settlement").slice(0, 5).map((e, i) => {
              const acc = CATEGORY_ACCENT[e.category] || CATEGORY_ACCENT.general;
              const Icon = acc.icon;
              const groupName = groups.find((g) => g.id === e.groupId)?.name || "Group";
              return (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => { setSelectedGroupId(e.groupId); setActiveTab("group-detail"); }}
                  className="flex items-center gap-3 px-4 py-3 border-b border-[#232323]/70 last:border-b-0 hover:bg-[#1A1A1A]/50 transition cursor-pointer"
                >
                  <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${acc.color}1A`, color: acc.color }}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold truncate">{e.name}</p>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-[#A1A1AA] min-w-0">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#1A1A1A] px-2 py-0.5 shrink-0"><Users className="w-2.5 h-2.5" />{groupName}</span>
                      <span className="inline-flex items-center gap-1 shrink-0"><Clock3 className="w-2.5 h-2.5" />{e.time}</span>
                      <span className="truncate">{e.person === "Felix" ? "You paid" : `${e.person} paid`}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-extrabold">{INR.format(e.amount)}</p>
                    <p className="text-[10px] font-bold uppercase" style={{ color: acc.color }}>{acc.label}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#A1A1AA]/50 shrink-0" />
                </motion.div>
              );
            })}
          </div>
        </section>
      </motion.div>
    );
  }

  // 2. GROUPS VIEW
  function renderGroupsView(data, isMobileFlow = false) {
    const q = searchQuery.toLowerCase();
    const list = data.groups.filter((g) => g.name.toLowerCase().includes(q) && (groupTab === "completed" ? g.status === "completed" : g.status !== "completed"));

    return (
      <motion.div
        key="groups"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="max-w-5xl space-y-5 text-left"
      >
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-3xl font-black tracking-[-0.03em]">Groups</h1>
            <p className="text-sm text-[#A1A1AA] mt-1">Manage your trips, groups &amp; expenses effortlessly.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => toast.success("Enter an invite code in the real app!")} className="rounded-full border border-[#232323] bg-[#111111] px-4 py-3 text-sm font-semibold flex items-center gap-2 hover:bg-[#1A1A1A] transition cursor-pointer">
              <KeyRound className="w-4 h-4 text-[#0891B2]" /> Join with code
            </button>
            <div className="relative p-[2px] rounded-full overflow-hidden">
              <span
                className="animate-border-orbit absolute -inset-[65%]"
                style={{ background: "conic-gradient(from 0deg, transparent 0deg, transparent 262deg, rgba(255,255,255,0.95) 300deg, rgba(165,243,252,0.9) 332deg, transparent 360deg)" }}
              />
              <button onClick={() => setShowAddGroupModal(true)} className="relative z-10 rounded-full bg-gradient-to-br from-cyan-600 to-teal-600 text-white font-bold text-sm px-5 py-3 flex items-center gap-2.5 shadow-[0_16px_36px_-14px_rgba(8,145,178,0.65)] cursor-pointer">
                <span className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center"><Plus className="w-3.5 h-3.5" /></span>
                New Group
              </button>
            </div>
          </div>
        </div>

        <div className="inline-flex rounded-2xl border border-[#232323] bg-[#1A1A1A]/50 p-1">
          {[["active", "Active Groups"], ["completed", "Completed"]].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setGroupTab(id)}
              className={`rounded-xl px-4 py-2 text-sm transition cursor-pointer ${groupTab === id ? "bg-[#111111] shadow-sm font-bold text-[#F5F5F5]" : "text-[#A1A1AA] font-bold"}`}
            >
              {label}
            </button>
          ))}
        </div>

        <h2 className="text-base font-bold text-[#0891B2]">Your Groups</h2>

        <div className={`grid ${isMobileFlow ? "grid-cols-1" : "grid-cols-2"} gap-4`}>
          {list.map((g, i) => {
            const done = g.status === "completed";
            const [a, b] = GROUP_GRADIENTS[i % GROUP_GRADIENTS.length];
            const others = g.members.filter((m) => m !== "Felix");
            return (
              <div
                key={g.id}
                onClick={() => { setSelectedGroupId(g.id); setActiveTab("group-detail"); }}
                className={`relative overflow-hidden shadow-sm rounded-[1.4rem] border bg-[#111111]/95 p-5 space-y-4 hover:-translate-y-0.5 transition cursor-pointer ${done ? "border-emerald-500/25" : "border-[#232323] hover:border-[#0891B2]/35"}`}
              >
                {done && (
                  <span className="absolute top-3 right-3 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400 inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Settled
                  </span>
                )}
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 text-white"
                    style={{ background: done ? "linear-gradient(135deg,#10b981,#059669)" : `linear-gradient(135deg, ${a}, ${b})` }}
                  >
                    {renderIcon(g.icon, "w-5 h-5")}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-base truncate">{g.name}</p>
                      <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#A1A1AA]">{g.type}</span>
                    </div>
                    <p className="text-xs text-[#A1A1AA]">{g.members.length} Members</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <AvatarStack names={g.members} size={32} max={3} text="text-[11px]" ring="ring-[#111111]" overlap="-space-x-2.5" solid />
                  <p className="text-xs text-[#A1A1AA] truncate">
                    {others.slice(0, 2).join(", ")}{others.length > 2 ? ` +${others.length - 2} more` : ""}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        {list.length === 0 && <p className="text-center text-[#A1A1AA] text-sm py-10">No groups found</p>}
      </motion.div>
    );
  }

  // 3. GROUP DETAIL VIEW
  function renderGroupDetailView(data, isMobileFlow = false) {
    const group = data.groups.find((g) => g.id === selectedGroupId) || data.groups[0];
    if (!group) return null;

    const groupExpenses = expenses.filter((e) => e.groupId === group.id);
    const membersSpends = {};
    group.members.forEach((m) => { membersSpends[m] = 0; });
    groupExpenses.forEach((e) => {
      if (!e.settled) membersSpends[e.person] = (membersSpends[e.person] || 0) + Number(e.amount);
    });
    const groupTotal = Object.values(membersSpends).reduce((sum, v) => sum + v, 0);
    const share = groupTotal / group.members.length;
    const balances = group.members.map((name) => ({ name, balance: (membersSpends[name] || 0) - share }));

    return (
      <motion.div
        key="group-detail"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="max-w-5xl space-y-4 text-left"
      >
        <button onClick={() => setActiveTab("groups")} className="flex items-center gap-1.5 text-xs font-semibold text-[#A1A1AA] hover:text-white transition cursor-pointer">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Groups
        </button>

        <div className="p-5 rounded-[1.4rem] border border-[#232323] bg-[#111111] relative overflow-hidden">
          <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-cyan-400/[0.07] blur-2xl" />
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white bg-gradient-to-br from-cyan-600 to-teal-500">
              {renderIcon(group.icon, "w-5 h-5")}
            </div>
            <div>
              <h3 className="text-base font-bold leading-tight">{group.name}</h3>
              <p className="text-xs text-[#A1A1AA]">{group.members.length} Members</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4 pt-3 border-t border-white/[0.07]">
            <div>
              <p className="text-[11px] font-semibold text-[#A1A1AA]">Total Group Spends</p>
              <p className="text-xl font-extrabold tracking-[-0.035em] mt-0.5">{INR.format(groupTotal)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#A1A1AA]">Your Share</p>
              <p className="text-xl font-extrabold tracking-[-0.035em] mt-0.5 text-cyan-300">{INR.format(share)}</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h4 className="text-base font-bold tracking-tight">Balances</h4>
            <button
              onClick={() => { setSettleAmount(Math.round(share)); setShowSettleModal(true); }}
              className="text-xs text-[#0891B2] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Handshake className="w-3.5 h-3.5" /> Record Settlement
            </button>
          </div>
          <div className="overflow-hidden rounded-2xl border border-[#232323] bg-[#111111]">
            {balances.map((b) => {
              const owes = b.balance < 0;
              return (
                <div key={b.name} className="flex items-center justify-between px-4 py-3 border-b border-[#232323]/70 last:border-b-0">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-cyan-950 text-cyan-300 flex items-center justify-center text-xs font-bold">{b.name.charAt(0)}</div>
                    <span className="text-sm font-bold">{b.name}{b.name === "Felix" && " (You)"}</span>
                  </div>
                  <span className={`text-sm font-extrabold ${b.balance === 0 ? "text-[#A1A1AA]" : owes ? "text-rose-400" : "text-emerald-400"}`}>
                    {b.balance === 0 ? "Settled" : `${owes ? "-" : "+"}${INR.format(Math.abs(b.balance))}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <button
          onClick={() => { setExpGroup(group.id); setShowAddExpenseModal(true); }}
          className="w-full h-11 flex items-center justify-center gap-2 rounded-xl text-sm font-semibold border border-cyan-600/25 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/15 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Expense
        </button>
      </motion.div>
    );
  }

  // 4. MESSAGES / CHATROOM VIEW
  function renderMessagesView(isMobileFlow = false, variant = "messages") {
    const list = chats[activeChatGroup] || [];
    const activeGroup = groups.find((g) => g.id === activeChatGroup);

    return (
      <motion.div
        key={variant}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="grid grid-cols-12 gap-3 h-[360px] text-left"
      >
        {!isMobileFlow && (
          <div className="col-span-4 rounded-2xl border border-[#232323] bg-[#111111] p-2 flex flex-col gap-1 overflow-y-auto custom-scrollbar">
            <span className="text-[11px] font-semibold text-[#A1A1AA] px-2 py-1.5">{variant === "chatroom" ? "Group chatrooms" : "Conversations"}</span>
            {groups.filter((g) => g.status !== "completed").map((g) => {
              const active = activeChatGroup === g.id;
              const last = (chats[g.id] || []).slice(-1)[0];
              return (
                <button
                  key={g.id}
                  onClick={() => setActiveChatGroup(g.id)}
                  className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-left transition cursor-pointer ${active ? "bg-white/[0.06]" : "hover:bg-white/[0.035]"}`}
                >
                  <div className="h-9 w-9 rounded-xl bg-cyan-500/10 flex items-center justify-center shrink-0" style={{ color: g.color }}>
                    {renderIcon(g.icon, "w-4 h-4")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-[13px] truncate ${active ? "font-bold" : "font-medium"}`}>{g.name}</p>
                    <p className="text-[11px] text-[#A1A1AA] truncate">{last ? `${last.sender}: ${last.text}` : "No messages yet"}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className={`${isMobileFlow ? "col-span-12" : "col-span-8"} flex flex-col h-full bg-[#111111] border border-[#232323] rounded-2xl overflow-hidden`}>
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[#232323]/70 flex-shrink-0">
            {isMobileFlow ? (
              <select
                value={activeChatGroup}
                onChange={(e) => setActiveChatGroup(e.target.value)}
                className="bg-transparent text-xs font-bold text-cyan-400 outline-none cursor-pointer"
              >
                {groups.filter((g) => g.status !== "completed").map((g) => (
                  <option key={g.id} value={g.id} className="bg-[#111111] text-white">{g.name}</option>
                ))}
              </select>
            ) : (
              <>
                <p className="text-sm font-bold">{activeGroup?.name}</p>
                <span className="text-[11px] text-[#A1A1AA]">{activeGroup?.members.length} members</span>
              </>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar min-h-0">
            {list.map((m, idx) => {
              const isMe = m.sender === "Felix";
              return (
                <div key={idx} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                  <span className="text-[10px] font-semibold text-[#A1A1AA] mb-0.5">{m.sender}</span>
                  <div className={`px-3.5 py-2 rounded-2xl text-xs leading-relaxed max-w-[85%] ${
                    isMe ? "bg-gradient-to-br from-cyan-600 to-teal-600 text-white rounded-tr-md font-medium" : "bg-[#1A1A1A] text-[#F5F5F5] rounded-tl-md border border-[#232323]"
                  }`}>
                    {m.text}
                  </div>
                </div>
              );
            })}
            <div data-scroll-end="chat" />
          </div>

          <form onSubmit={handleSendChatMessage} className="p-3 border-t border-[#232323]/70 flex items-center gap-2 flex-shrink-0">
            <input
              type="text"
              placeholder="Type message..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 h-10 px-4 text-xs text-[#F5F5F5] bg-white/[0.05] border border-[#232323] rounded-full outline-none focus:border-cyan-500/50 placeholder:text-[#A1A1AA]"
            />
            <button type="submit" className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-600 to-teal-700 flex items-center justify-center text-white hover:brightness-110 transition flex-shrink-0 cursor-pointer">
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </motion.div>
    );
  }

  // 5. AI ASSISTANT VIEW
  function renderAiView(isMobileFlow = false) {
    const SUGGESTIONS = [
      { key: "spends", label: "Analysis Spends", query: "spends" },
      { key: "owes", label: "Who owes me?", query: "owes" },
      { key: "categories", label: "Spends breakdown", query: "categories" }
    ];

    return (
      <motion.div
        key="ai"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="flex flex-col h-[360px] bg-[#111111] border border-[#232323] rounded-2xl overflow-hidden relative text-left"
      >
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar min-h-0">
          {aiMessages.map((m) => {
            const isUser = m.role === "user";
            return (
              <div key={m.id} className={`flex items-start gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}>
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-600 to-teal-600 flex items-center justify-center text-white shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                  <span className="text-[10px] font-semibold text-[#A1A1AA] mb-0.5">{isUser ? "Felix" : "SplitEase AI"}</span>
                  <div className={`px-3.5 py-2 rounded-2xl text-xs leading-relaxed max-w-[90%] whitespace-pre-line ${
                    isUser ? "bg-gradient-to-br from-cyan-600 to-teal-600 text-white rounded-tr-md font-medium" : "bg-[#1A1A1A] text-[#F5F5F5] border border-[#232323] rounded-tl-md"
                  }`}>
                    {m.content}
                  </div>
                </div>
              </div>
            );
          })}
          {aiLoading && (
            <div className="flex items-center gap-2 text-[#A1A1AA] text-xs italic animate-pulse">
              <Bot className="w-4 h-4 animate-spin" />
              <span>AI calculations in progress...</span>
            </div>
          )}
          <div data-scroll-end="ai" />
        </div>

        {aiMessages.length === 1 && (
          <div className="px-4 pb-2 flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.key}
                onClick={() => handleAskAI(s.query)}
                className="px-3 py-1.5 text-[11px] font-semibold text-cyan-300 bg-cyan-500/10 border border-cyan-600/25 rounded-full hover:bg-cyan-500/20 transition select-none cursor-pointer whitespace-nowrap"
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => { e.preventDefault(); handleAskAI(); }}
          className="p-3 border-t border-[#232323]/70 flex items-center gap-2 flex-shrink-0"
        >
          <input
            type="text"
            placeholder="Ask AI e.g. 'Who owes me?'"
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
            className="flex-1 h-10 px-4 text-xs text-[#F5F5F5] bg-white/[0.05] border border-[#232323] rounded-full outline-none focus:border-cyan-500/50 placeholder:text-[#A1A1AA]"
          />
          <button type="submit" className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-600 to-teal-700 flex items-center justify-center text-white hover:brightness-110 transition flex-shrink-0 cursor-pointer">
            <Send className="w-4 h-4" />
          </button>
        </form>
      </motion.div>
    );
  }


  // 7. CREATE GROUP MODAL DESIGN
  function renderAddGroupModal() {
    const groupIconOptions = ["plane", "trip", "rent", "food", "movie", "beer", "ski", "car"];
    return (
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-[#111111] border border-white/10 rounded-2xl max-w-sm w-full p-5 shadow-2xl relative text-left"
        >
          <button onClick={() => setShowAddGroupModal(false)} className="absolute top-3.5 right-3.5 p-1 text-white/30 hover:text-white hover:bg-white/5 rounded-lg">
            <X className="w-4 h-4" />
          </button>
          
          <h3 className="text-sm font-black text-white mb-0.5">Create Trip Room</h3>
          <p className="text-[10px] text-white/40 mb-4">Start a split folder for vacation or lodging spends</p>

          <form onSubmit={handleCreateGroup} className="space-y-3.5">
            <div>
              <label className="text-[8.5px] font-bold text-white/30 uppercase tracking-widest block mb-1">Group Name</label>
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g. Manali Trek"
                className="w-full px-3 py-2 text-xs text-white/80 bg-white/5 border border-white/5 rounded-xl outline-none focus:border-cyan-500/30"
              />
            </div>

            <div>
              <label className="text-[8.5px] font-bold text-white/30 uppercase tracking-widest block mb-1">Choose Icon</label>
              <div className="flex gap-1.5 overflow-x-auto py-1.5 scrollbar-hide">
                {groupIconOptions.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setNewGroupIcon(key)}
                    className={`w-7.5 h-7.5 rounded-lg flex items-center justify-center border transition ${
                      newGroupIcon === key
                        ? "bg-cyan-500 border-cyan-400 text-slate-950"
                        : "bg-white/5 border-white/5 text-white/50 hover:text-white"
                    }`}
                  >
                    {renderIcon(key, "w-4 h-4")}
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" className="w-full py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 transition text-center mt-2 cursor-pointer shadow-md">
              Create Folder
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // 8. ADD EXPENSE MODAL DESIGN
  function renderAddExpenseModal() {
    return (
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-[#111111] border border-white/10 rounded-2xl max-w-sm w-full p-5 shadow-2xl relative text-left"
        >
          <button onClick={() => setShowAddExpenseModal(false)} className="absolute top-3.5 right-3.5 p-1 text-white/30 hover:text-white hover:bg-white/5 rounded-lg">
            <X className="w-4 h-4" />
          </button>
          
          <h3 className="text-sm font-black text-white mb-0.5">Log Expense</h3>
          <p className="text-[10px] text-white/40 mb-4">Add a new spend item to share costs with friends</p>

          <form onSubmit={handleAddExpense} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[8.5px] font-bold text-white/30 uppercase tracking-widest block mb-1">Select Group</label>
                <select
                  value={expGroup}
                  onChange={(e) => setExpGroup(e.target.value)}
                  className="w-full px-3 py-2 text-xs text-white/80 bg-white/5 border border-white/5 rounded-xl outline-none focus:border-cyan-500/30"
                >
                  {groups.filter((g) => g.status !== "completed").map((g) => (
                    <option key={g.id} value={g.id} className="bg-slate-950 text-white">{g.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[8.5px] font-bold text-white/30 uppercase tracking-widest block mb-1">Spent Category</label>
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs text-white/80 bg-white/5 border border-white/5 rounded-xl outline-none focus:border-cyan-500/30"
                >
                  <option value="food" className="bg-slate-950 text-white">Food / Dining</option>
                  <option value="travel" className="bg-slate-950 text-white">Travel / Transport</option>
                  <option value="stay" className="bg-slate-950 text-white">Stay / Hotel</option>
                  <option value="rent" className="bg-slate-950 text-white">Bills / Rent</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[8.5px] font-bold text-white/30 uppercase tracking-widest block mb-1">Expense Name</label>
              <input
                type="text"
                value={expName}
                onChange={(e) => setExpName(e.target.value)}
                placeholder="e.g. Seafood Dinner at Thalassa"
                className="w-full px-3 py-2 text-xs text-white/80 bg-white/5 border border-white/5 rounded-xl outline-none focus:border-cyan-500/30"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[8.5px] font-bold text-white/30 uppercase tracking-widest block mb-1">Amount Paid (₹)</label>
                <input
                  type="number"
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value)}
                  placeholder="e.g. 2400"
                  className="w-full px-3 py-2 text-xs text-white/80 bg-white/5 border border-white/5 rounded-xl outline-none focus:border-cyan-500/30"
                />
              </div>
              <div>
                <label className="text-[8.5px] font-bold text-white/30 uppercase tracking-widest block mb-1">Paid By</label>
                <select
                  value={expPayer}
                  onChange={(e) => setExpPayer(e.target.value)}
                  className="w-full px-3 py-2 text-xs text-white/80 bg-white/5 border border-white/5 rounded-xl outline-none focus:border-cyan-500/30"
                >
                  <option value="Felix" className="bg-slate-950 text-white">Felix (You)</option>
                  <option value="Priya" className="bg-slate-950 text-white">Priya</option>
                  <option value="Alex" className="bg-slate-950 text-white">Alex</option>
                  <option value="Lily" className="bg-slate-950 text-white">Lily</option>
                </select>
              </div>
            </div>

            <button type="submit" className="w-full py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 transition text-center mt-2 cursor-pointer shadow-md">
              Log Cost Splitting
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // 9. SETTLE MODAL DESIGN
  function renderSettleModal() {
    return (
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-[#111111] border border-white/10 rounded-2xl max-w-sm w-full p-5 shadow-2xl relative text-left"
        >
          <button onClick={() => setShowSettleModal(false)} className="absolute top-3.5 right-3.5 p-1 text-white/30 hover:text-white hover:bg-white/5 rounded-lg">
            <X className="w-4 h-4" />
          </button>
          
          <h3 className="text-sm font-black text-white mb-0.5">Settle Up Balances</h3>
          <p className="text-[10px] text-white/40 mb-4">Record a direct payment between group members</p>

          <form onSubmit={handleRecordSettlement} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[8.5px] font-bold text-white/30 uppercase tracking-widest block mb-1">From Member</label>
                <select
                  value={settlePayer}
                  onChange={(e) => setSettlePayer(e.target.value)}
                  className="w-full px-3 py-2 text-xs text-white/80 bg-white/5 border border-white/5 rounded-xl outline-none focus:border-cyan-500/30"
                >
                  <option value="Priya" className="bg-slate-950 text-white">Priya</option>
                  <option value="Alex" className="bg-slate-950 text-white">Alex</option>
                  <option value="Lily" className="bg-slate-950 text-white">Lily</option>
                </select>
              </div>
              <div>
                <label className="text-[8.5px] font-bold text-white/30 uppercase tracking-widest block mb-1">To Member</label>
                <select
                  disabled
                  className="w-full px-3 py-2 text-xs text-white/40 bg-white/5 border border-white/5 rounded-xl outline-none"
                >
                  <option value="Felix" className="bg-slate-950 text-white">Felix (You)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[8.5px] font-bold text-white/30 uppercase tracking-widest block mb-1">Amount Transferred (₹)</label>
              <input
                type="number"
                value={settleAmount}
                onChange={(e) => setSettleAmount(e.target.value)}
                placeholder="e.g. 1200"
                className="w-full px-3 py-2 text-xs text-white/80 bg-white/5 border border-white/5 rounded-xl outline-none focus:border-cyan-500/30"
              />
            </div>

            <button type="submit" className="w-full py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 transition text-center mt-2 cursor-pointer shadow-md">
              Record Settle Up
            </button>
          </form>
        </motion.div>
      </div>
    );
  }
}

// ArrowLeft local replacement
function ArrowLeft(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>
    </svg>
  );
}

const GROUP_GRADIENTS = [
  ["#0891B2", "#14b8a6"],
  ["#14b8a6", "#0284C7"],
  ["#0E7490", "#22D3EE"],
  ["#0284C7", "#0891B2"],
];

const AVATAR_BG = [
  "bg-cyan-500", "bg-teal-500", "bg-emerald-500", "bg-rose-500", "bg-amber-500",
];
const AVATAR_SOFT = [
  "bg-cyan-950 text-cyan-300", "bg-teal-950 text-teal-300", "bg-emerald-950 text-emerald-300",
  "bg-sky-950 text-sky-300", "bg-violet-950 text-violet-300",
];

const CATEGORY_ACCENT = {
  food: { icon: Utensils, color: "#ec4899", label: "Food" },
  travel: { icon: Plane, color: "#0891B2", label: "Travel" },
  rent: { icon: Home, color: "#0E7490", label: "Housing" },
  shopping: { icon: ShoppingBag, color: "#14b8a6", label: "Shopping" },
  stay: { icon: BedDouble, color: "#8b5cf6", label: "Stay" },
  general: { icon: Ticket, color: "#f59e0b", label: "General" },
};

const QUICK_SPLITS = [
  { title: "Cab to airport", people: 3, name: "Priya", amount: 1200 },
  { title: "Movie tickets", people: 4, name: "Alex", amount: 2040 },
];

function AvatarStack({ names, size, max, text, ring, overlap = "-space-x-1.5", solid = false }) {
  const shown = names.slice(0, max);
  const extra = names.length - shown.length;
  const dim = { width: size, height: size };
  return (
    <div className={`flex ${overlap} shrink-0`}>
      {shown.map((n, i) => (
        <div
          key={n}
          style={dim}
          className={`rounded-full ring-2 ${ring} flex items-center justify-center font-bold ${text} ${solid ? `${AVATAR_BG[i % AVATAR_BG.length]} text-white` : AVATAR_SOFT[i % AVATAR_SOFT.length]}`}
        >
          {n.charAt(0)}
        </div>
      ))}
      {extra > 0 && (
        <div style={dim} className={`rounded-full ring-2 ${ring} bg-[#1A1A1A] text-[#A1A1AA] flex items-center justify-center font-bold ${text}`}>
          +{extra}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, tile, label, value, valueClass = "", sub }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#232323] bg-[#111111] p-3.5">
      <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-cyan-400/[0.07] blur-2xl" />
      <div className="relative flex items-center gap-2.5">
        <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${tile}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-[#A1A1AA] truncate">{label}</p>
          <p className={`text-2xl font-extrabold tracking-[-0.035em] leading-tight truncate ${valueClass}`}>{value}</p>
        </div>
      </div>
      <p className="relative mt-2.5 border-t border-white/[0.07] pt-2.5 text-[11px] text-[#A1A1AA] truncate">{sub}</p>
    </div>
  );
}

function SectionHeader({ icon: Icon, tile, title, subtitle, onLink }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ring-1 flex items-center justify-center shrink-0 ${tile}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-base font-bold tracking-tight">{title}</h3>
        <p className="text-xs text-[#A1A1AA]">{subtitle}</p>
      </div>
      {onLink && (
        <button onClick={onLink} className="text-xs font-semibold text-[#0891B2] flex items-center gap-1 hover:underline shrink-0 cursor-pointer">
          View all groups <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
