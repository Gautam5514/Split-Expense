"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

export default function TestimonialsSection() {
  return (
    <section className="py-24 bg-slate-900 text-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-100px] right-[-100px] w-96 h-96 bg-purple-600 rounded-full blur-[150px] opacity-30" />
        <div className="absolute bottom-[-100px] left-[-100px] w-96 h-96 bg-indigo-600 rounded-full blur-[150px] opacity-30" />
      </div>

      <div className="container mx-auto max-w-6xl px-6 relative z-10">
        <h2 className="text-4xl font-bold text-center mb-16">
          Loved by 50,000+ Travelers
        </h2>

        <div className="grid md:grid-cols-3 gap-8">
          <TestimonialCard
            quote="I used to hate being the 'math person' on trips. SplitEase made our Japan trip completely stress-free."
            author="Sarah Jenkins"
            role="Backpacker"
          />
          <TestimonialCard
            quote="The currency conversion is a game changer. We didn't have to worry about exchange rates once."
            author="David Chen"
            role="Business Traveler"
          />
          <TestimonialCard
            quote="Cleanest UI of any splitting app I've used. My parents figured it out in 5 minutes."
            author="Elena Rodriguez"
            role="Family Vacationer"
          />
        </div>
      </div>
    </section>
  );
}

function TestimonialCard({ quote, author, role }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      className="bg-white/10 backdrop-blur-md border border-white/10 p-8 rounded-2xl text-left"
    >
      <div className="flex gap-1 text-yellow-400 mb-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} size={16} fill="currentColor" />
        ))}
      </div>
      <p className="text-lg text-indigo-50 italic mb-6">'{quote}'</p>
      <div>
        <p className="font-bold text-white">{author}</p>
        <p className="text-sm text-indigo-200">{role}</p>
      </div>
    </motion.div>
  );
}
