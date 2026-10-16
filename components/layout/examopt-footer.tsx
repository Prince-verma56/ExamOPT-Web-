/**
 * ExamOpt Studio — Footer
 * Restrained footer aligned to the homepage content grid. Every link points to
 * a real route or homepage section.
 */

import Link from "next/link";
import { BrandMark, Container } from "@/components/marketing/primitives";

const footerLinks = [
  {
    title: "Product",
    links: [
      { name: "Overview", href: "/#product" },
      { name: "How It Works", href: "/#how-it-works" },
      { name: "Capabilities", href: "/#capabilities" },
      { name: "Transparency", href: "/#transparency" },
    ],
  },
  {
    title: "Workspace",
    links: [
      { name: "Admin Dashboard", href: "/admin" },
      { name: "Data Workspace", href: "/admin/data" },
      { name: "Constraints", href: "/admin/constraints" },
      { name: "Student Portal", href: "/student" },
    ],
  },
];

export function ExamOptFooter() {
  return (
    <footer className="border-t border-[#ebe8df] bg-white">
      <Container className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
        <div className="sm:col-span-2 lg:col-span-5">
          <Link href="/" className="inline-flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
            <BrandMark className="size-6" />
            <span className="text-[15px] font-semibold tracking-tight text-foreground">
              ExamOpt <span className="font-normal text-muted-foreground">Studio</span>
            </span>
          </Link>
          <p className="mt-4 max-w-[22rem] text-[13.5px] leading-relaxed text-muted-foreground">
            Intelligent examination timetable optimisation for universities — feasible,
            explainable schedules built from your own data.
          </p>
        </div>

        {footerLinks.map((column) => (
          <div key={column.title} className="lg:col-span-2">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-foreground">{column.title}</h2>
            <ul className="mt-4 space-y-2.5">
              {column.links.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="rounded-sm text-[13.5px] text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="lg:col-span-3">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-foreground">Hackathon</h2>
          <p className="mt-4 text-[13.5px] leading-relaxed text-muted-foreground">
            GLA HackVision 2.0
            <br />
            Problem Statement C10 — Intelligent Examination Timetable Optimization System
          </p>
        </div>
      </Container>

      <Container className="flex flex-col gap-2 border-t border-[#efece5] py-6 text-[12px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} ExamOpt Studio.</p>
        <p>Scheduling engine in development · previews use sample data.</p>
      </Container>
    </footer>
  );
}
