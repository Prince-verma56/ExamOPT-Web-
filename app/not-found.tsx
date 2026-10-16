"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { MoveLeft } from "lucide-react";
import { useEffect, useRef } from "react";
import gsap from "gsap";

export default function NotFound() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    gsap.fromTo(containerRef.current.children, 
      { y: 20, opacity: 0 }, 
      { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: "power3.out" }
    );
  }, []);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background px-4">
      <div ref={containerRef} className="flex max-w-md flex-col items-center text-center">
        <h1 className="text-8xl font-light tracking-tighter text-foreground mb-4">404</h1>
        <h2 className="text-2xl font-medium tracking-tight mb-2">Page not found</h2>
        <p className="text-muted-foreground mb-8 text-balance">
          The page you are looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex items-center gap-4">
          <Link href="javascript:history.back()" className={buttonVariants({ variant: "outline" })}>
            <MoveLeft className="mr-2 h-4 w-4" />
            Go Back
          </Link>
          <Link href="/" className={buttonVariants({ variant: "default" })}>
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}
