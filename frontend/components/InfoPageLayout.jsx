import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";

export default function InfoPageLayout({
  eyebrow,
  title,
  description,
  icon: Icon,
  sections,
  asideTitle,
  asideItems = [],
}) {
  return (
    <div className="min-h-screen bg-background px-4 pb-24 pt-6 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/login"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={16} />
          Back to login
        </Link>

        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <main className="space-y-6">
            <section className="rounded-lg border border-border bg-card p-6 shadow-sm sm:p-8">
              <div className="mb-6 flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-600 ring-1 ring-cyan-500/20 dark:text-cyan-400">
                  <Icon size={24} />
                </div>
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-400">
                    {eyebrow}
                  </p>
                  <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                    {title}
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                    {description}
                  </p>
                </div>
              </div>
            </section>

            {sections.map((section) => (
              <section
                key={section.title}
                className="rounded-lg border border-border bg-card p-6 shadow-sm sm:p-7"
              >
                <h2 className="text-lg font-bold text-foreground">{section.title}</h2>
                <div className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
                  {section.body.map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>
              </section>
            ))}
          </main>

          <aside className="h-fit rounded-lg border border-border bg-card p-6 shadow-sm">
            <h2 className="text-base font-bold text-foreground">{asideTitle}</h2>
            <div className="mt-4 space-y-3">
              {asideItems.map((item) => (
                <div key={item.label} className="rounded-lg bg-muted p-4">
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">{item.value}</p>
                </div>
              ))}
            </div>
            <Link
              href="/contact"
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-cyan-700"
            >
              <Mail size={16} />
              Contact support
            </Link>
          </aside>
        </div>
      </div>
    </div>
  );
}
