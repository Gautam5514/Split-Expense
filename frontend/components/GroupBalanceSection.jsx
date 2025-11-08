"use client";

import { motion } from "framer-motion";
import { Wallet2, Coins, ArrowDownCircle, ArrowUpCircle, SmilePlus } from "lucide-react";

export default function GroupBalanceSection({ balances }) {
  const hasBalances = balances?.balances?.length > 0;
  const hasSuggestions = balances?.suggestions?.length > 0;

  return (
    <section className="bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800 rounded-2xl p-6 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-pink-400">
          <Wallet2 size={18} /> Balances
        </h2>
        {hasBalances && (
          <span className="text-xs text-gray-500">
            {balances.balances.length}{" "}
            {balances.balances.length === 1 ? "entry" : "entries"}
          </span>
        )}
      </div>

      {/* No Balances Yet */}
      {!hasBalances ? (
        <div className="text-center py-10">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-800/60 flex items-center justify-center text-pink-400">
            <Coins size={22} />
          </div>
          <p className="text-gray-400 text-sm">
            No balances yet — add some expenses to see who owes whom.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {balances.balances.map((b, i) => (
            <motion.div
              key={b.userId || i}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex justify-between items-center bg-gray-800/60 p-4 rounded-lg text-sm border border-gray-700/60 transition-all hover:bg-gray-800 hover:border-emerald-600/40`}
            >
              <div className="flex items-center gap-2">
                {b.balance > 0 ? (
                  <ArrowUpCircle size={16} className="text-emerald-400" />
                ) : b.balance < 0 ? (
                  <ArrowDownCircle size={16} className="text-red-400" />
                ) : (
                  <SmilePlus size={16} className="text-gray-500" />
                )}
                <span className="text-gray-200 font-medium">{b.name}</span>
              </div>

              <span
                className={`font-semibold ${
                  b.balance > 0
                    ? "text-emerald-400"
                    : b.balance < 0
                    ? "text-red-400"
                    : "text-gray-500"
                }`}
              >
                {b.balance > 0
                  ? `+₹${b.balance}`
                  : b.balance < 0
                  ? `-₹${Math.abs(b.balance)}`
                  : "Settled"}
              </span>
            </motion.div>
          ))}
        </div>
      )}

      {/* Settlement Suggestions */}
      {hasSuggestions && (
        <div className="mt-8">
          <h3 className="text-md font-semibold mb-3 text-emerald-400 flex items-center gap-2">
            💡 Smart Settlement Suggestions
          </h3>
          <div className="space-y-3">
            {balances.suggestions.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="bg-gray-800/60 border border-gray-700/60 p-4 rounded-lg text-sm text-gray-300 flex items-center justify-between hover:bg-gray-800 hover:border-emerald-600/40 transition-all"
              >
                <div>
                  <b className="text-red-400">{s.from.name}</b>{" "}
                  <span className="text-gray-400">should pay</span>{" "}
                  <b className="text-emerald-400">₹{s.amount}</b>{" "}
                  <span className="text-gray-400">to</span>{" "}
                  <b className="text-blue-400">{s.to.name}</b>
                </div>
                <span className="text-[11px] text-gray-500 uppercase tracking-wide">
                  Suggestion #{i + 1}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
