"use client";

import { useRouter } from "next/navigation";
import {
  Plane,
  Users,
  Wallet2,
  Sparkles,
  CheckCircle,
  TrendingUp,
  ShieldCheck,
  DollarSign,
  BookOpen,
  MessageSquare,
} from "lucide-react";

export default function HomePage() {
  const router = useRouter();

  // Inject styles for animations once
  if (
    typeof document !== "undefined" &&
    !document.getElementById("home-page-style")
  ) {
    const style = document.createElement("style");
    style.id = "home-page-style";
    style.innerHTML = `
      @keyframes bounce-slow {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-15px); }
      }
      .animate-bounce-slow {
        animation: bounce-slow 4s ease-in-out infinite;
      }
      @keyframes float {
        0% { transform: translatey(0px); }
        50% { transform: translatey(-20px); }
        100% { transform: translatey(0px); }
      }
      .animate-float {
        animation: float 6s ease-in-out infinite;
      }
      .scroll-fade-in {
        opacity: 0;
        transform: translateY(30px);
        transition: opacity 0.8s ease-out, transform 0.8s ease-out;
      }
      .scroll-fade-in.visible {
        opacity: 1;
        transform: translateY(0);
      }
    `;
    document.head.appendChild(style);

    // Intersection Observer for scroll animations
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    setTimeout(() => {
      document
        .querySelectorAll(".scroll-fade-in")
        .forEach((el) => observer.observe(el));
    }, 100);
  }

  return (
    <div className="flex min-h-screen flex-col items-center relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-indigo-100 dark:from-zinc-950 dark:via-black dark:to-zinc-950 px-6 sm:px-8">
      {/* 🌈 Animated gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-emerald-300/10 via-fuchsia-300/10 to-indigo-300/10 animate-pulse blur-3xl opacity-60 pointer-events-none" />

      {/* ✈️ Floating decorative icons */}
      <div className="absolute top-20 left-10 opacity-30 animate-float">
        <Plane className="w-12 h-12 text-emerald-500" />
      </div>
      <div className="absolute bottom-20 right-10 opacity-30 animate-float [animation-delay:3s]">
        <Wallet2 className="w-12 h-12 text-indigo-500" />
      </div>

      {/* ✨ Hero Section */}
      <header className="flex flex-col items-center text-center py-20 sm:py-32 z-10">
        <div className="flex items-center gap-3 mb-4 scroll-fade-in">
          <Sparkles className="text-emerald-500 w-9 h-9" />
          <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            SplitEase Travel
          </h1>
        </div>

        <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-3xl leading-relaxed scroll-fade-in [transition-delay:200ms]">
          💸 The ultimate tool for group travel expenses. Create groups, add
          shared costs, and settle up with ease. Focus on the memories, not the
          math.
        </p>

        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 italic scroll-fade-in [transition-delay:300ms]">
          “Because great trips deserve stress-free money moments.” 🌴
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mt-10 z-10 scroll-fade-in [transition-delay:400ms]">
          <button
            onClick={() => router.push("/login")}
            className="px-8 py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-all duration-300 shadow-lg shadow-emerald-500/30 hover:scale-105 transform"
          >
            Get Started for Free
          </button>
          <button
            onClick={() => router.push("/register")}
            className="px-8 py-3 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200 font-semibold hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all duration-300 hover:scale-105 transform"
          >
            Create an Account
          </button>
        </div>
      </header>

      {/* 🚀 How It Works Section */}
      <section className="py-20 max-w-5xl w-full z-10">
        <div className="text-center mb-12 scroll-fade-in">
          <h2 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
            Splitting Bills in 3 Easy Steps
          </h2>
          <p className="mt-3 text-lg text-gray-600 dark:text-gray-300">
            Organizing your group expenses has never been simpler.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 text-center">
          <HowItWorksStep
            icon={<Users className="w-10 h-10 text-emerald-500" />}
            step="Step 1"
            title="Create Your Group"
            desc="Start a new group for your trip, event, or apartment. Invite your friends to join in seconds."
            delay="200ms"
          />
          <HowItWorksStep
            icon={<DollarSign className="w-10 h-10 text-indigo-500" />}
            step="Step 2"
            title="Add Expenses"
            desc="Anyone in the group can add bills for flights, hotels, or dinners. Snap a receipt for proof."
            delay="400ms"
          />
          <HowItWorksStep
            icon={<CheckCircle className="w-10 h-10 text-fuchsia-500" />}
            step="Step 3"
            title="Settle Up Instantly"
            desc="Our app does the math! See exactly who owes whom and settle debts with a single click."
            delay="600ms"
          />
        </div>
      </section>

      {/* 🌟 Why Choose Us Section */}
      <section className="py-20 max-w-6xl w-full z-10">
        <div className="text-center mb-12 scroll-fade-in">
          <h2 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
            All The Features You Need
          </h2>
          <p className="mt-3 text-lg text-gray-600 dark:text-gray-300">
            We've packed SplitEase with powerful tools to make your life easier.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard
            icon={<TrendingUp />}
            title="Real-Time Sync"
            desc="All expenses and balances update instantly across all group members' devices."
          />
          <FeatureCard
            icon={<ShieldCheck />}
            title="Secure & Private"
            desc="Your financial data is encrypted and secure. Your groups are private and by invitation only."
          />
          <FeatureCard
            icon={<BookOpen />}
            title="Detailed Summaries"
            desc="Get a complete overview of your spending with charts and downloadable reports."
          />
          <FeatureCard
            icon={<Plane />}
            title="Multi-Currency Support"
            desc="Perfect for international travel. Add expenses in any currency and we'll handle the conversion."
          />
          <FeatureCard
            icon={<Users />}
            title="Flexible Splitting"
            desc="Split costs equally, by exact amounts, by percentage, or by shares. We cover all scenarios."
          />
          <FeatureCard
            icon={<MessageSquare />}
            title="Expense Comments"
            desc="Keep things clear by adding notes and comments to any expense. No more confusion!"
          />
        </div>
      </section>

      {/* 👥 Testimonials Section */}
      <section className="py-20 w-full z-10">
        <div className="text-center mb-12 scroll-fade-in">
          <h2 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
            Loved by Travelers Worldwide
          </h2>
        </div>
        <div className="max-w-5xl mx-auto grid lg:grid-cols-3 gap-8">
          <TestimonialCard
            quote="This app was a lifesaver on our Europe trip! No more awkward money conversations. Everything was transparent and easy."
            author="Alex Johnson"
            location="San Francisco, USA"
          />
          <TestimonialCard
            quote="As the 'planner' of my friend group, SplitEase is my secret weapon. It makes organizing big group dinners and vacations a breeze."
            author="Maria Garcia"
            location="Madrid, Spain"
          />
          <TestimonialCard
            quote="Finally, a splitting app that looks great and is simple to use. The summary feature is fantastic for budget tracking."
            author="Kenji Tanaka"
            location="Tokyo, Japan"
          />
        </div>
      </section>
      
      {/* 🚀 Final Call to Action */}
      <section className="py-20 w-full z-10">
        <div className="max-w-4xl mx-auto text-center bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md border border-gray-200 dark:border-gray-800 rounded-2xl p-10 sm:p-16 scroll-fade-in">
           <h2 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
            Ready to Simplify Your Group Expenses?
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Join thousands of users who are traveling smarter. Create your first group today and experience stress-free financial tracking.
          </p>
           <button
            onClick={() => router.push("/login")}
            className="mt-8 px-10 py-4 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-all duration-300 shadow-xl shadow-emerald-500/30 hover:scale-105 transform"
          >
            Start Splitting Now
          </button>
        </div>
      </section>


      {/* 💜 Footer */}
      <footer className="py-12 text-center text-gray-500 dark:text-gray-400 text-sm z-10">
        <p>© {new Date().getFullYear()} SplitEase Travel. All Rights Reserved.</p>
      </footer>
    </div>
  );
}

/* 🧩 Reusable Feature Card Component */
function FeatureCard({ icon, title, desc }) {
  return (
    <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-2 scroll-fade-in">
      <div className="flex items-center gap-3 mb-3 text-emerald-500">
        {icon}
        <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
          {title}
        </h3>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400">{desc}</p>
    </div>
  );
}

/* 🧩 How It Works Step Component */
function HowItWorksStep({ icon, step, title, desc, delay }) {
  return (
    <div
      className="flex flex-col items-center p-6 scroll-fade-in"
      style={{ transitionDelay: delay }}
    >
      <div className="mb-4">{icon}</div>
      <p className="text-sm font-semibold text-emerald-600 mb-1">{step}</p>
      <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-400">{desc}</p>
    </div>
  );
}

/* 🧩 Testimonial Card Component */
function TestimonialCard({ quote, author, location }) {
  return (
    <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md border border-gray-200 dark:border-gray-800 rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2 scroll-fade-in">
      <p className="text-gray-700 dark:text-gray-300 italic">`{quote}`</p>
      <p className="font-bold text-gray-900 dark:text-white mt-4">{author}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400">{location}</p>
    </div>
  );
}