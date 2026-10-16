/**
 * ExamOpt Studio — Homepage footer
 *
 * The quiet conclusion of the page: same content grid and light surfaces as
 * the sections above, organised links, and an honest note about previews.
 */

"use client";

import Link from "next/link";
import { ArrowUp } from "lucide-react";
import { AnchorLink } from "@/components/marketing/anchor-link";
import { BrandLockup, Container } from "@/components/marketing/primitives";

const PRODUCT_LINKS = [
  { name: "The problem", href: "/#problem" },
  { name: "How it works", href: "/#how-it-works" },
  { name: "Capabilities", href: "/#capabilities" },
  { name: "Transparency", href: "/#transparency" },
] as const;

const WORKSPACE_LINKS = [
  { name: "Admin dashboard", href: "/admin" },
  { name: "Data workspace", href: "/admin/data" },
  { name: "Constraints", href: "/admin/constraints" },
  { name: "Optimization lab", href: "/admin/optimization" },
  { name: "Schedules", href: "/admin/schedules" },
];

const STUDENT_LINKS = [
  { name: "Student portal", href: "/student" },
  { name: "My timetable", href: "/student/timetable" },
  { name: "Sign in", href: "/sign-in" },
];

const linkClass =
  "rounded-sm text-[14px] text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40";

function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <nav aria-label={title}>
      <h2 className="type-label text-foreground/70">{title}</h2>
      <ul className="mt-5 space-y-3">{children}</ul>
    </nav>
  );
}

export function ExamOptFooter() {
  return (
    <footer className="border-t border-hairline bg-canvas-deep">
      <Container className="grid gap-12 py-16 sm:grid-cols-2 lg:grid-cols-12 lg:gap-10 lg:py-20">
        <div className="sm:col-span-2 lg:col-span-5">
          <Link href="/" aria-label="ExamOpt Studio home" className="inline-flex rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
            <BrandLockup />
          </Link>
          <p className="mt-5 max-w-[34ch] text-[14px] leading-relaxed text-muted-foreground">
            Intelligent examination timetable optimisation for universities — feasible, explainable
            schedules built from institutional constraints.
          </p>
          <p className="mt-6 text-[12.5px] text-muted-foreground">
            GLA HackVision 2.0 · Problem statement C10
          </p>
        </div>

        <div className="lg:col-span-2">
          <Column title="Product">
            {PRODUCT_LINKS.map(({ name, href }) => (
              <li key={name}>
                <AnchorLink href={href} className={linkClass}>
                  {name}
                </AnchorLink>
              </li>
            ))}
          </Column>
        </div>

        <div className="lg:col-span-3">
          <Column title="Workspace">
            {WORKSPACE_LINKS.map(({ name, href }) => (
              <li key={name}>
                <Link href={href} className={linkClass}>
                  {name}
                </Link>
              </li>
            ))}
          </Column>
        </div>

        <div className="lg:col-span-2">
          <Column title="Students">
            {STUDENT_LINKS.map(({ name, href }) => (
              <li key={name}>
                <Link href={href} className={linkClass}>
                  {name}
                </Link>
              </li>
            ))}
          </Column>
        </div>
      </Container>

      <div className="border-t border-hairline">
        <Container className="flex flex-col gap-4 py-6 text-[12.5px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} ExamOpt Studio</p>
          <p>Product previews on this page use sample data, not scheduling results.</p>
          <AnchorLink
            href="#top"
            className="inline-flex items-center gap-1.5 self-start rounded-full border border-hairline bg-white/70 px-3 py-1.5 text-foreground/80 outline-none transition-colors hover:bg-white hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 sm:self-auto"
          >
            Back to top
            <ArrowUp className="size-3.5" aria-hidden />
          </AnchorLink>
        </Container>
      </div>
    </footer>
  );
}
