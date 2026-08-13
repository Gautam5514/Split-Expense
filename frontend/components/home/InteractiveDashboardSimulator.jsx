"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Home, MessageCircle, Bot,
  Bell, Search, Plus, Receipt, Settings, ChevronRight,
  CheckCircle2, PlusCircle, X, Send,
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
  { id: "goa", name: "Goa Trip", icon: "trip", members: ["Felix", "Priya", "Alex", "Lily"], total: 12400, color: "#0891B2", pct: 65, status: "active" },
  { id: "rent", name: "Monthly Rent", icon: "rent", members: ["Felix", "Lily", "Alex"], total: 45000, color: "#0E7490", pct: 90, status: "active" },
  { id: "lunch", name: "Office Lunch", icon: "food", members: ["Felix", "Priya", "Alex", "Lily", "Sam"], total: 3200, color: "#ec4899", pct: 40, status: "active" },
  { id: "movie", name: "Movie Night", icon: "movie", members: ["Felix", "Lily", "Alex", "Priya"], total: 1800, color: "#f59e0b", pct: 100, status: "active" },
];

const INITIAL_EXPENSES = [
  { id: "e1", groupId: "goa", name: "Hotel Booking", person: "Felix", amount: 8000, time: "2h ago", icon: "hotel", settled: false, category: "stay", date: new Date(Date.now() - 2 * 60 * 60 * 1000) },
  { id: "e2", groupId: "goa", name: "Beach Dinner", person: "Priya", amount: 2400, time: "5h ago", icon: "dining", settled: false, category: "food", date: new Date(Date.now() - 5 * 60 * 60 * 1000) },
  { id: "e3", groupId: "rent", name: "Rent Payment", person: "Alex", amount: 45000, time: "1d ago", icon: "rent", settled: false, category: "rent", date: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  { id: "e4", groupId: "goa", name: "Taxi Airport", person: "Priya", amount: 1200, time: "1d ago", icon: "car", settled: true, category: "travel", date: new Date(Date.now() - 26 * 60 * 60 * 1000) },
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
};

const MOCK_AI_RESPONSES = {
  spend: "Across your active groups, you have spent a combined total of **₹62,400**. Your largest group expense is **Monthly Rent** (₹45,000) followed by the **Goa Trip** (₹12,400). You paid ₹8,000 for hotel booking, keeping you in an overall credit position of +₹4,560!",
  categories: "Here is your spending analysis by category:\n- **Rent/Housing**: ₹45,000 (72%)\n- **Lodging/Stay**: ₹8,000 (13%)\n- **Dining/Food**: ₹5,600 (9%)\n- **Travel/Transport**: ₹3,000 (5%)\n- **Entertainment**: ₹1,800 (3%)\n\n*Tip: Dining costs are 12% higher than average this month!*",
  owes: "Active balances summary:\n- **Priya** owes you ₹1,200 (Goa Trip beach dinner split)\n- **Alex** owes you ₹2,040 (Movie Night tickets and taxi)\n- **You** owe **Lily** ₹640 (Office Lunch)\n\nNet overall, others owe you **₹2,600**.",
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
  const [expenseFilter, setExpenseFilter] = useState("all");

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
  const [settlePayer, setSettlePayer] = useState("Priya");
  const [settleAmount, setSettleAmount] = useState(1200);

  // Message chat container ref for auto scroll
  const chatEndRef = useRef(null);
  const aiEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats, activeChatGroup]);

  useEffect(() => {
    aiEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages, aiLoading]);

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

    // Return all calculated indicators
    return {
      groups: updatedGroups,
      totalSpent: totalSpentByFelix,
      youOwe: totalOwe,
      owed: totalOwed,
    };
  }, [groups, expenses]);

  // Settle up lists (Felix balances per member for settle modal)
  const settleUpList = [
    { name: "Priya", amount: 1200, owed: true },
    { name: "Alex", amount: 2040, owed: true },
    { name: "Lily", amount: 640, owed: false },
  ];

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
    const newId = newGroupName.toLowerCase().replace(/[^a-z0-9]/g, "-");
    const newG = {
      id: newId,
      name: newGroupName.trim(),
      icon: newGroupIcon,
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
      date: new Date()
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
    const to = from === "Lily" ? "Felix" : "Felix";

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
      date: new Date()
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

  // Nav Items list
  const NAV_ITEMS = [
    { id: "dashboard", icon: Home, label: "Dashboard" },
    { id: "groups", icon: Users, label: "Groups" },
    { id: "expenses", icon: Receipt, label: "Expenses" },
    { id: "messages", icon: MessageCircle, label: "Messages" },
    { id: "ai", icon: Bot, label: "AI" },
  ];

  return (
    <div className="w-full relative">
      
      {/* 🖥️ DESKTOP VIEWPORT CHASSIS */}
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
            <span>splitease.app/dashboard</span>
          </div>
          <div className="flex gap-1.5">
            {[Bell, Settings].map((Icon, i) => (
              <button key={i} onClick={() => toast.success("Feature simulated in sandbox!")} className="w-6 h-6 rounded-md flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/80 transition">
                <Icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>
        </div>

        {/* Dashboard inner layout */}
        <div className="flex bg-black/35 text-foreground h-[480px]">
          
          {/* Left Sidebar */}
          <aside className="w-48 xl:w-52 flex-shrink-0 flex flex-col py-5 px-3 border-r border-white/10 bg-white/[0.03] backdrop-blur-md">
            <div className="flex items-center gap-2 px-2 mb-6">
              <div className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center border border-white/10 flex-shrink-0 bg-cyan-950">
                <img src="/logo.svg" className="w-full h-full object-cover" alt="Logo" />
              </div>
              <span className="font-extrabold text-sm text-white tracking-tight">SplitEase</span>
            </div>
            
            <nav className="flex flex-col gap-1 flex-1">
              {NAV_ITEMS.map(({ id, icon: Icon, label }) => {
                const isActive = activeTab === id || (id === "groups" && activeTab === "group-detail");
                return (
                  <button
                    key={id}
                    onClick={() => {
                      setActiveTab(id);
                      setSelectedGroupId(null);
                    }}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer select-none text-left transition-all ${
                      isActive
                        ? "bg-cyan-500/10 border border-cyan-500/25 text-white font-bold"
                        : "text-white/45 hover:text-white/80 hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 text-xs font-semibold">
                      <Icon className="w-4 h-4" />
                      {label}
                    </div>
                    {id === "messages" && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">5</span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Profile widget */}
            <div className="mt-auto flex items-center gap-2.5 px-2 py-2 rounded-xl bg-white/[0.04] border border-white/10">
              <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Felix&backgroundColor=c4b5fd" className="w-7.5 h-7.5 rounded-lg object-cover bg-teal-900" alt="Felix" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate leading-tight">Felix Kumar</p>
                <p className="text-[9px] text-white/35 truncate">felix@gmail.com</p>
              </div>
              <button onClick={() => toast.success("Felix profile active!")} className="p-1 hover:bg-white/5 rounded-lg text-white/20 hover:text-white/60">
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 flex flex-col min-w-0 bg-transparent relative overflow-hidden">
            
            {/* View Header */}
            <header className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-white/[0.01] flex-shrink-0">
              <div>
                <h2 className="text-sm font-bold text-white leading-tight flex items-center gap-1.5">
                  {activeTab === "dashboard" && (
                    <>
                      Good morning, Felix
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                    </>
                  )}
                  {activeTab === "groups" && "Active Spends"}
                  {activeTab === "group-detail" && "Trip Expenses Room"}
                  {activeTab === "expenses" && "All Cost Items"}
                  {activeTab === "messages" && "Friend Conversations"}
                  {activeTab === "ai" && "SplitEase Assistant"}
                </h2>
                <p className="text-[10px] text-white/30 mt-0.5">
                  {activeTab === "dashboard" && "4 pending expenses across groups"}
                  {activeTab === "groups" && `${groups.length} groups overall`}
                  {activeTab === "group-detail" && `${calculatedData.groups.find(g => g.id === selectedGroupId)?.name} Detail`}
                  {activeTab === "expenses" && `${expenses.length} expenses logged`}
                  {activeTab === "messages" && "Simulated text channels"}
                  {activeTab === "ai" && "Powered by Gemini 3.5 Flash"}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 w-3 h-3 text-white/25" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs text-white/80 bg-white/5 border border-white/10 rounded-lg outline-none focus:border-cyan-500/30 w-36 lg:w-44 transition"
                  />
                </div>
                {activeTab !== "messages" && activeTab !== "ai" && (
                  <button
                    onClick={() => {
                      if (activeTab === "dashboard" || activeTab === "groups") {
                        setShowAddGroupModal(true);
                      } else {
                        setShowAddExpenseModal(true);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{activeTab === "dashboard" || activeTab === "groups" ? "New Group" : "Add Spent"}</span>
                  </button>
                )}
              </div>
            </header>

            {/* Scrollable View Content */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <AnimatePresence mode="wait">
                {activeTab === "dashboard" && renderDashboardView(calculatedData)}
                {activeTab === "groups" && renderGroupsView(calculatedData)}
                {activeTab === "group-detail" && renderGroupDetailView(calculatedData)}
                {activeTab === "expenses" && renderExpensesView()}
                {activeTab === "messages" && renderMessagesView()}
                {activeTab === "ai" && renderAiView()}
              </AnimatePresence>
            </div>
          </main>
        </div>
      </div>

      {/* 📱 SMARTPHONE CHASSIS FOR MOBILE */}
      <div className="block sm:hidden w-full max-w-[310px] mx-auto rounded-[36px] border-[10px] border-white/10 bg-black/40 backdrop-blur-xl shadow-[0_30px_60px_-10px_rgba(0,0,0,0.8)] overflow-hidden select-none aspect-[9/19] flex flex-col relative">
        
        {/* Notch */}
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-20 h-4 bg-white/10 rounded-full z-30 flex items-center justify-center border border-white/5">
          <div className="w-2.5 h-2.5 rounded-full bg-black/80 absolute right-4" />
        </div>
        
        {/* Mobile status bar */}
        <div className="h-9 pt-2.5 px-6 flex justify-between items-center text-[10px] font-bold text-white/60 bg-white/5 border-b border-white/5 z-20">
          <span>9:41</span>
          <div className="flex gap-1">
            <span>5G</span>
            <span className="w-4 h-2.5 border border-white/40 rounded-sm bg-white/60" />
          </div>
        </div>

        {/* Content body */}
        <div className="flex-1 bg-transparent text-foreground overflow-y-auto custom-scrollbar flex flex-col pb-12">
          {/* Mobile headers */}
          <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-cyan-400 flex items-center">
                {activeTab === "group-detail" ? renderIcon("trip", "w-4 h-4") : <Sparkles className="w-4 h-4" />}
              </span>
              <span className="text-xs font-black text-white truncate">
                {activeTab === "dashboard" && "Dashboard"}
                {activeTab === "groups" && "Groups"}
                {activeTab === "group-detail" && "Goa Trip Details"}
                {activeTab === "expenses" && "Expenses"}
                {activeTab === "messages" && "Chat"}
                {activeTab === "ai" && "SplitEase AI"}
              </span>
            </div>
            
            <button
              onClick={() => {
                if (activeTab === "dashboard" || activeTab === "groups") {
                  setShowAddGroupModal(true);
                } else {
                  setShowAddExpenseModal(true);
                }
              }}
              className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs"
            >
              +
            </button>
          </div>

          <div className="flex-1 p-3 overflow-y-auto">
            {activeTab === "dashboard" && renderDashboardView(calculatedData, true)}
            {activeTab === "groups" && renderGroupsView(calculatedData, true)}
            {activeTab === "group-detail" && renderGroupDetailView(calculatedData, true)}
            {activeTab === "expenses" && renderExpensesView(true)}
            {activeTab === "messages" && renderMessagesView(true)}
            {activeTab === "ai" && renderAiView(true)}
          </div>
        </div>

        {/* Mobile Bottom Navigation Bar */}
        <div className="absolute bottom-0 inset-x-0 h-13 border-t border-white/10 bg-white/5 backdrop-blur-md flex justify-around items-center px-2 z-20">
          {NAV_ITEMS.map(({ id, icon: Icon, label }) => {
            const isActive = activeTab === id || (id === "groups" && activeTab === "group-detail");
            return (
              <button
                key={id}
                onClick={() => {
                  setActiveTab(id);
                  setSelectedGroupId(null);
                }}
                className={`flex flex-col items-center gap-0.5 ${isActive ? "text-cyan-400" : "text-white/40"}`}
              >
                <Icon className="w-4.5 h-4.5" />
                <span className="text-[7.5px] font-bold">{label}</span>
              </button>
            );
          })}
        </div>

        {/* Home Indicator Bar */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-20 h-1 bg-white/30 rounded-full z-20" />
      </div>

      {/* ── INTERACTIVE MODALS (RENDERED ON TOP) ── */}
      {showAddGroupModal && renderAddGroupModal()}
      {showAddExpenseModal && renderAddExpenseModal()}
      {showSettleModal && renderSettleModal()}
    </div>
  );

  // 1. DASHBOARD VIEW RENDERER
  function renderDashboardView(data, isMobileFlow = false) {
    return (
      <motion.div
        key="dashboard"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="space-y-4 text-left"
      >
        {/* Spend Overview KPIs */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Expenses", value: INR.format(62400), color: "text-white", bg: "bg-white/5" },
            { label: "You Owe", value: INR.format(data.youOwe), color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
            { label: "Owed", value: INR.format(data.owed), color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" }
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`p-2 rounded-xl border border-white/5 ${bg}`}>
              <p className="text-[8px] uppercase tracking-wider text-white/40 font-bold truncate">{label}</p>
              <p className={`text-[11px] sm:text-xs font-black mt-0.5 ${color} truncate`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Dynamic Groups Row */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[10px] sm:text-xs font-extrabold text-white uppercase tracking-wider">Your Groups</h3>
            <button onClick={() => setActiveTab("groups")} className="text-[9px] text-cyan-400 font-bold hover:underline">View All</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {data.groups.slice(0, isMobileFlow ? 2 : 4).map((g) => (
              <div
                key={isMobileFlow ? `mobile-dash-group-${g.id}` : `desktop-dash-group-${g.id}`}
                onClick={() => {
                  setSelectedGroupId(g.id);
                  setActiveTab("group-detail");
                }}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-cyan-500/20 transition cursor-pointer flex flex-col justify-between"
              >
                <div className="flex justify-between items-start">
                  <div className="w-7 h-7 rounded-lg mb-1.5 flex items-center justify-center" style={{ background: `${g.color}22`, border: `1px solid ${g.color}40`, color: g.color }}>
                    {renderIcon(g.icon, "w-3.5 h-3.5")}
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-white/20" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-white truncate leading-tight">{g.name}</p>
                  <p className="text-[8px] text-white/35 mt-0.5 truncate">{g.members.length} members · {INR.format(g.total)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Expenses List & Settle up split */}
        <div className={`grid ${isMobileFlow ? "grid-cols-1" : "grid-cols-12"} gap-4`}>
          {/* Recent Expenses */}
          <div className={`${isMobileFlow ? "col-span-1" : "col-span-7"} space-y-2`}>
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-extrabold text-white uppercase tracking-wider">Recent Logs</h3>
              <button onClick={() => setActiveTab("expenses")} className="text-[9px] text-cyan-400 font-bold hover:underline">See All</button>
            </div>
            
            <div className="space-y-1.5 max-h-[140px] overflow-y-auto custom-scrollbar">
              {expenses.slice(0, 3).map((e) => (
                <div key={isMobileFlow ? `mobile-dash-exp-${e.id}` : `desktop-dash-exp-${e.id}`} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-white/5 bg-white/[0.03] hover:bg-white/[0.08] transition">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center shrink-0 text-white/60">
                      {renderIcon(e.icon, "w-3 h-3")}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9.5px] font-bold text-white truncate">{e.name}</p>
                      <p className="text-[8px] text-white/30 truncate">by {e.person} · {e.time}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[9.5px] font-black ${e.settled ? "text-emerald-400" : "text-white"}`}>
                      {INR.format(e.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Settle up right dashboard pane */}
          {!isMobileFlow && (
            <div className="col-span-5 space-y-2">
              <h3 className="text-[10px] font-extrabold text-white uppercase tracking-wider">Quick Actions</h3>
              <div className="space-y-1.5">
                {settleUpList.slice(0, 2).map((u) => (
                  <div key={u.name} className="flex items-center justify-between p-2 rounded-xl border border-white/5 bg-cyan-500/5 hover:bg-cyan-500/10 transition">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-6.5 h-6.5 rounded-full bg-cyan-500/10 flex items-center justify-center text-[10px] font-bold text-cyan-400 shrink-0">
                        {u.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] font-bold text-white truncate">{u.name}</p>
                        <p className="text-[7.5px] text-white/40 truncate">owes you</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[9px] font-extrabold text-emerald-400">{INR.format(u.amount)}</p>
                      <button onClick={() => triggerReminder(u.name)} className="text-[8px] text-cyan-400 hover:text-cyan-300 font-bold hover:underline cursor-pointer">
                        Remind
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // 2. GROUPS VIEW RENDERER
  function renderGroupsView(data, isMobileFlow = false) {
    const filteredGroups = groups.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
      <motion.div
        key="groups"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="space-y-4 text-left"
      >
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-bold text-white/40 tracking-wider uppercase">Active Trip Rooms</span>
          <button onClick={() => setShowAddGroupModal(true)} className="text-[9px] text-cyan-400 font-bold hover:underline flex items-center gap-1">
            <PlusCircle className="w-3 h-3" /> New Trip
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {filteredGroups.map((g) => (
            <div
              key={isMobileFlow ? `mobile-groups-list-${g.id}` : `desktop-groups-list-${g.id}`}
              onClick={() => {
                setSelectedGroupId(g.id);
                setActiveTab("group-detail");
              }}
              className="p-3 rounded-xl border border-white/5 hover:border-cyan-500/30 bg-white/5 hover:bg-white/10 transition cursor-pointer flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${g.color}22`, border: `1px solid ${g.color}40`, color: g.color }}>
                  {renderIcon(g.icon, "w-5 h-5")}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-black text-white truncate leading-snug">{g.name}</h4>
                  <p className="text-[9px] text-white/35 truncate mt-0.5">
                    {g.members.join(", ")}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-black text-white leading-tight">{INR.format(g.total)}</p>
                <span className="inline-block text-[8px] font-bold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded-md mt-1 border border-cyan-500/10">
                  {g.members.length} Members
                </span>
              </div>
            </div>
          ))}
          {filteredGroups.length === 0 && (
            <p className="text-center text-white/30 text-xs italic py-8">No groups found</p>
          )}
        </div>
      </motion.div>
    );
  }

  // 3. GROUP DETAIL VIEW RENDERER
  function renderGroupDetailView(data, isMobileFlow = false) {
    const group = data.groups.find((g) => g.id === selectedGroupId) || data.groups[0];
    if (!group) return null;

    const groupExpenses = expenses.filter((e) => e.groupId === group.id);
    
    // Calculates balances for the current group
    const membersSpends = {};
    group.members.forEach((m) => {
      membersSpends[m] = 0;
    });

    groupExpenses.forEach((e) => {
      if (!e.settled) {
        membersSpends[e.person] = (membersSpends[e.person] || 0) + Number(e.amount);
      }
    });

    const groupTotal = Object.values(membersSpends).reduce((sum, v) => sum + v, 0);
    const share = groupTotal / group.members.length;

    const balances = group.members.map((name) => {
      const balance = (membersSpends[name] || 0) - share;
      return { name, balance };
    });

    return (
      <motion.div
        key="group-detail"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="space-y-4 text-left"
      >
        {/* Back Button */}
        <button
          onClick={() => setActiveTab("dashboard")}
          className="flex items-center gap-1.5 text-[9px] font-bold text-white/40 hover:text-white transition uppercase tracking-widest"
        >
          <ArrowLeft className="w-3 h-3" /> Back to List
        </button>

        {/* Group Stats Card */}
        <div className="p-3.5 rounded-xl border border-white/10 bg-white/[0.03] bg-gradient-to-r from-cyan-500/[0.02] to-teal-500/[0.02] relative overflow-hidden backdrop-blur-md">
          <div className="absolute top-2 right-2 opacity-20" style={{ color: group.color }}>{renderIcon(group.icon, "w-10 h-10")}</div>
          <h3 className="text-sm font-black text-white leading-tight">{group.name}</h3>
          <p className="text-[9px] text-white/40 mt-0.5">Overall group room expense log</p>
          
          <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-white/5">
            <div>
              <p className="text-[8px] uppercase tracking-wide text-white/35 font-bold">Total Group Spends</p>
              <p className="text-sm font-black text-white mt-0.5">{INR.format(groupTotal)}</p>
            </div>
            <div>
              <p className="text-[8px] uppercase tracking-wide text-white/35 font-bold">Your Share</p>
              <p className="text-sm font-black text-cyan-400 mt-0.5">{INR.format(share)}</p>
            </div>
          </div>
        </div>

        {/* Group Balances List */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h4 className="text-[10px] font-bold text-white/40 tracking-wider uppercase">Balances Position</h4>
            <button
              onClick={() => {
                setSettleAmount(Math.round(share));
                setShowSettleModal(true);
              }}
              className="text-[9px] text-cyan-400 hover:text-cyan-300 font-bold hover:underline flex items-center gap-1"
            >
              <Handshake className="w-3 h-3" /> Record Settlement
            </button>
          </div>
          <div className="space-y-1.5 max-h-[140px] overflow-y-auto custom-scrollbar">
            {balances.map((b) => {
              const owes = b.balance < 0;
              const isMe = b.name === "Felix";
              return (
                <div key={isMobileFlow ? `mobile-detail-bal-${b.name}` : `desktop-detail-bal-${b.name}`} className="flex items-center justify-between p-2 rounded-lg border border-white/5 bg-white/[0.02]">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-[9px] font-bold text-white/60">
                      {b.name.charAt(0)}
                    </div>
                    <span className="text-[10px] font-bold text-white">{b.name} {isMe && "(You)"}</span>
                  </div>
                  <span className={`text-[10px] font-black ${b.balance === 0 ? "text-white/40" : owes ? "text-red-400" : "text-emerald-400"}`}>
                    {b.balance === 0 ? "Settled" : `${owes ? "-" : "+"}${INR.format(Math.abs(b.balance))}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Button inside detail */}
        <button
          onClick={() => {
            setExpGroup(group.id);
            setShowAddExpenseModal(true);
          }}
          className="w-full flex items-center justify-center gap-1.5 p-2 rounded-xl text-xs font-bold text-white bg-white/5 border border-white/10 hover:bg-white/10 hover:border-cyan-500/20 transition"
        >
          <Plus className="w-4 h-4" /> Add Spent Item
        </button>
      </motion.div>
    );
  }

  // 4. EXPENSES VIEW RENDERER
  function renderExpensesView(isMobileFlow = false) {
    const filtered = expenses.filter((e) => {
      const matchesSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (expenseFilter === "all") return matchesSearch;
      return matchesSearch && e.category === expenseFilter;
    });

    const CATEGORIES = ["all", "food", "travel", "stay", "rent"];

    return (
      <motion.div
        key="expenses"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="space-y-4.5 text-left animate-in fade-in zoom-in duration-200"
      >
        {/* Category Horizontal Filter Tags */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide py-0.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setExpenseFilter(cat)}
              className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase transition select-none cursor-pointer whitespace-nowrap border ${
                expenseFilter === cat
                  ? "bg-cyan-500 text-slate-950 border-cyan-400/20"
                  : "bg-white/5 text-white/50 border-white/5 hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Expenses List */}
        <div className="space-y-1.5 max-h-[220px] overflow-y-auto custom-scrollbar">
          {filtered.map((e) => {
            const groupName = groups.find((g) => g.id === e.groupId)?.name || "Group";
            return (
              <div key={isMobileFlow ? `mobile-exp-list-${e.id}` : `desktop-exp-list-${e.id}`} className="flex items-center justify-between p-2.5 rounded-xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.08] transition duration-150">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 border border-white/5 text-white/60">
                    {renderIcon(e.icon, "w-4 h-4")}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-white truncate leading-snug">{e.name}</p>
                    <p className="text-[8px] text-white/35 mt-0.5 truncate">
                      Paid by {e.person} in <span className="text-cyan-400 font-semibold">{groupName}</span>
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-[10px] font-black ${e.settled ? "text-emerald-400" : "text-white"}`}>
                    {INR.format(e.amount)}
                  </p>
                  <span className="text-[7.5px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-white/40 block mt-1 font-extrabold text-center">
                    {e.category}
                  </span>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-center text-white/30 text-xs italic py-10">No transactions recorded</p>
          )}
        </div>
      </motion.div>
    );
  }

  // 5. MESSAGES VIEW RENDERER
  function renderMessagesView(isMobileFlow = false) {
    const list = chats[activeChatGroup] || [];

    return (
      <motion.div
        key="messages"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="grid grid-cols-12 gap-3 h-[380px] text-left"
      >
        {/* Left Side: Mock Rooms (Hidden on mobile) */}
        {!isMobileFlow && (
          <div className="col-span-4 border-r border-white/5 pr-2.5 flex flex-col gap-1 overflow-y-auto custom-scrollbar">
            <span className="text-[8.5px] font-bold text-white/30 tracking-widest uppercase mb-1 px-1">ROOM CHANNELS</span>
            {groups.map((g) => {
              const active = activeChatGroup === g.id;
              return (
                <button
                  key={g.id}
                  onClick={() => setActiveChatGroup(g.id)}
                  className={`w-full flex items-center gap-2 p-2 rounded-xl text-left transition select-none cursor-pointer border ${
                    active ? "bg-white/5 border-white/10 text-white" : "border-transparent text-white/40 hover:text-white/80 hover:bg-white/5"
                  }`}
                >
                  <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center shrink-0" style={{ color: g.color }}>
                    {renderIcon(g.icon, "w-3 h-3")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold truncate leading-tight">{g.name}</p>
                    <p className="text-[7.5px] text-white/30 truncate mt-0.5">Active thread</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Right Side: Chat Windows */}
        <div className={`${isMobileFlow ? "col-span-12" : "col-span-8"} flex flex-col justify-between h-full bg-black/20 border border-white/10 rounded-xl overflow-hidden relative backdrop-blur-md`}>
          
          {/* Active channel header (Mobile only) */}
          {isMobileFlow && (
            <div className="flex gap-2 p-2 border-b border-white/5 bg-slate-900/40">
              <select
                value={activeChatGroup}
                onChange={(e) => setActiveChatGroup(e.target.value)}
                className="bg-transparent text-[10px] font-bold text-cyan-400 outline-none cursor-pointer"
              >
                {groups.map(g => (
                  <option key={g.id} value={g.id} className="bg-slate-950 text-white">{g.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar min-h-0">
            {list.map((m, idx) => {
              const isMe = m.sender === "Felix";
              return (
                <div key={isMobileFlow ? `mobile-msg-${idx}` : `desktop-msg-${idx}`} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                  <span className="text-[7.5px] font-bold text-white/30 mb-0.5">{m.sender}</span>
                  <div className={`px-3 py-2 rounded-2xl text-[9.5px] leading-relaxed max-w-[85%] ${
                    isMe
                      ? "bg-cyan-500 text-slate-950 rounded-tr-none font-semibold shadow-sm"
                      : "bg-white/5 text-white rounded-tl-none border border-white/5"
                  }`}>
                    {m.text}
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Form input */}
          <form onSubmit={handleSendChatMessage} className="p-2 border-t border-white/5 bg-slate-950/40 flex items-center gap-1.5 flex-shrink-0">
            <input
              type="text"
              placeholder="Type message..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 px-3 py-1.5 text-[9.5px] text-white/80 bg-white/5 border border-white/5 rounded-lg outline-none focus:border-cyan-500/20"
            />
            <button type="submit" className="w-7 h-7 rounded-lg bg-cyan-500 flex items-center justify-center text-slate-950 hover:bg-cyan-400 transition flex-shrink-0">
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </motion.div>
    );
  }

  // 6. AI ASSISTANT VIEW RENDERER
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
        className="flex flex-col justify-between h-[380px] bg-black/20 border border-white/10 rounded-xl overflow-hidden relative text-left backdrop-blur-md"
      >
        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3 custom-scrollbar min-h-0">
          {aiMessages.map((m) => {
              const isUser = m.role === "user";
              return (
                <div key={isMobileFlow ? `mobile-ai-msg-${m.id}` : `desktop-ai-msg-${m.id}`} className={`flex items-start gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}>
                {!isUser && (
                  <div className="w-6.5 h-6.5 rounded-lg bg-gradient-to-br from-cyan-600 to-teal-600 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-sm border border-white/10">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}
                <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                  <span className="text-[7.5px] font-bold text-white/30 tracking-widest uppercase mb-0.5 font-mono">
                    {isUser ? "Felix" : "SplitEase AI Core"}
                  </span>
                  <div className={`px-3 py-2 rounded-2xl text-[9.5px] leading-relaxed shadow-sm max-w-[90%] whitespace-pre-line ${
                    isUser
                      ? "bg-gradient-to-br from-cyan-600 to-teal-600 text-white rounded-tr-none font-semibold border border-cyan-400/20"
                      : "bg-white/5 text-white border border-white/5 rounded-tl-none"
                  }`}>
                    {m.content}
                  </div>
                </div>
              </div>
            );
          })}
          {aiLoading && (
            <div className="flex items-center gap-2 text-white/40 text-[9px] font-mono italic animate-pulse">
              <Bot className="w-3.5 h-3.5 animate-spin" />
              <span>AI calculations in progress...</span>
            </div>
          )}
          <div ref={aiEndRef} />
        </div>

        {/* Suggestion Chips */}
        {aiMessages.length === 1 && (
          <div className="px-3 pb-2 flex flex-wrap gap-1">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.key}
                onClick={() => handleAskAI(s.query)}
                className="px-2.5 py-1 text-[8px] font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/20 transition select-none cursor-pointer whitespace-nowrap"
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        {/* Form input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAskAI();
          }}
          className="p-2 border-t border-white/5 bg-slate-950/40 flex items-center gap-1.5 flex-shrink-0"
        >
          <input
            type="text"
            placeholder="Ask AI e.g. 'Who owes me?'"
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
            className="flex-1 px-3 py-1.5 text-[9.5px] text-white/80 bg-white/5 border border-white/5 rounded-lg outline-none focus:border-cyan-500/20 font-medium"
          />
          <button type="submit" className="w-7 h-7 rounded-lg bg-cyan-500 flex items-center justify-center text-slate-950 hover:bg-cyan-400 transition flex-shrink-0">
            <Send className="w-3.5 h-3.5" />
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
          className="bg-zinc-950/80 backdrop-blur-2xl border border-white/10 rounded-2xl max-w-sm w-full p-5 shadow-2xl relative text-left"
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
          className="bg-zinc-950/80 backdrop-blur-2xl border border-white/10 rounded-2xl max-w-sm w-full p-5 shadow-2xl relative text-left"
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
                  {groups.map((g) => (
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
          className="bg-zinc-950/80 backdrop-blur-2xl border border-white/10 rounded-2xl max-w-sm w-full p-5 shadow-2xl relative text-left"
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
