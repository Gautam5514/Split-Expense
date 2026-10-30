"use client";

import SectionHeading from "./SectionHeading";

import { useRef } from "react";
import { useInView, useReducedMotion } from "framer-motion";
import styles from "./IntelligenceSection.module.css";
import MeshDriftBackground from "./MeshDriftBackground";

const SKILLS = [
  { id: "instant-split", name: "Instant Split", title: "One bill. Every share.", description: "Equal, by shares, or exact amounts. Split it your way, while everyone’s numbers stay balanced." },
  { id: "receipt-vision", name: "Receipt Vision", title: "Keep the whole picture.", description: "Save the bill with the expense. Every detail, right where it belongs. AI itemization is coming soon." },
  { id: "settle-chat", name: "Settle Chat", title: "Money meets conversation.", description: "The plans, the payments, the “got it.” Keep your group’s expenses and conversations together." },
  { id: "debt-graph", name: "Debt Graph", title: "Find the shorter way.", description: "Untangle who owes whom. Simplify group balances into fewer transfers, with the same result." },
  { id: "live-ledger", name: "Live Ledger", title: "One update. Everywhere.", description: "Phone, tablet, or web. A shared ledger keeps everyone looking at the same numbers." },
  { id: "settle-confirm", name: "Settle Confirm", title: "Both sides. All clear.", description: "Mark it paid. Confirm it arrived. Update the balance when both people agree, with a record to match." },
];

export default function IntelligenceSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { amount: .08 });
  const reduced = useReducedMotion();
  return <section ref={ref} className={styles.section} data-animating={inView && !reduced ? "true" : "false"} aria-labelledby="intelligence-title">
    <MeshDriftBackground sectionRef={ref} running={inView} reduced={reduced} />
    <div className={styles.content}>
      <SectionHeading eyebrow="Inside the SplitEase engine" title="Six skills." secondary="Everything in sync." description="Less keeping track. More being together. A little intelligence in every shared expense." id="intelligence-title" />
      <div className={styles.grid}>
        {SKILLS.map((skill, index) => <article key={skill.id} className={styles.card}>
          <div className={styles.copy}><div className={styles.label}><h3>{skill.name}</h3><span>0{index + 1}</span></div><h4>{skill.title}</h4><p>{skill.description}</p></div>
          <div className={styles.visual}><div className={styles.visualGlow} /><img src={`/intelligence/${skill.id}.svg`} alt="" width="480" height="300" loading="lazy" decoding="async" /></div>
        </article>)}
      </div>
    </div>
  </section>;
}
