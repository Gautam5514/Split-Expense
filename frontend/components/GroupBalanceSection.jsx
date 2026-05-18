"use client";

import { motion } from "framer-motion";
import { Wallet2, Coins, ArrowDownCircle, ArrowUpCircle, SmilePlus } from "lucide-react";

export default function GroupBalanceSection({ balances }) {
  const hasBalances = balances?.balances?.length > 0;
  const hasSuggestions = balances?.suggestions?.length > 0;

  return (
    <section className="bg-card border border-border rounded p-6 ">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-primary">
          <Wallet2 size={18} className="text-primary" /> Balances
        </h2>

        {hasBalances && (
          <span className="text-xs text-muted-foreground">
            {balances.balances.length}{" "}
            {balances.balances.length === 1 ? "entry" : "entries"}
          </span>
        )}
      </div>

      {/* No Balances */}
      {!hasBalances ? (
        <div className="text-center py-10">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted border border-border flex items-center justify-center">
            <Coins size={22} className="text-primary" />
          </div>
          <p className="text-muted-foreground text-sm">
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
              className="flex justify-between items-center bg-muted p-4 rounded-lg text-sm border border-border transition hover:border-primary/50"
            >
              <div className="flex items-center gap-2">
                {b.balance > 0 ? (
                  <ArrowUpCircle size={16} className="text-green-600" />
                ) : b.balance < 0 ? (
                  <ArrowDownCircle size={16} className="text-red-600" />
                ) : (
                  <SmilePlus size={16} className="text-muted-foreground" />
                )}
                <span className="text-foreground font-medium">{b.name}</span>
              </div>

              <span
                className={`font-semibold ${b.balance > 0
                    ? "text-green-600"
                    : b.balance < 0
                      ? "text-red-600"
                      : "text-muted-foreground"
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

      {/* Suggestions */}
      {hasSuggestions && (
        <div className="mt-8">
          <h3 className="text-md font-semibold mb-3 text-primary flex items-center gap-2">
            💡 Smart Settlement Suggestions
          </h3>

          <div className="space-y-3">
            {balances.suggestions.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="bg-muted border border-border p-4 rounded-lg text-sm text-foreground flex items-center justify-between hover:border-primary/50 transition"
              >
                <div>
                  <b className="text-red-600">{s.from.name}</b>{" "}
                  <span className="text-muted-foreground">should pay</span>{" "}
                  <b className="text-green-600">₹{s.amount}</b>{" "}
                  <span className="text-muted-foreground">to</span>{" "}
                  <b className="text-primary">{s.to.name}</b>
                </div>

                <span className="text-[11px] text-muted-foreground uppercase tracking-wide">
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
