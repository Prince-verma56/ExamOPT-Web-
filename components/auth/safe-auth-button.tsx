"use client";

import { Show, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { User } from "lucide-react";

/**
 * NEXT_PUBLIC_* values are inlined at build time, so this is identical on the
 * server and the client and can be read during render without a hydration
 * mismatch. It mirrors the check in providers/auth-provider.tsx.
 */
export const HAS_CLERK = (() => {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  return Boolean(key && (key.startsWith("pk_test_") || key.startsWith("pk_live_")));
})();

export function SafeUserButton({ className }: { className?: string }) {
  if (!HAS_CLERK) {
    return (
      <div className={cn("h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0", className)}>
        <User className="h-4 w-4" />
      </div>
    );
  }

  return (
    <>
      <Show when="signed-in">
        <UserButton appearance={{ elements: { avatarBox: "h-7 w-7" } }} />
      </Show>
      <Show when="signed-out">
        <Link
          href="/sign-in"
          className={cn(
            "h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors shrink-0",
            className
          )}
          title="Sign In"
        >
          <User className="h-4 w-4" />
        </Link>
      </Show>
    </>
  );
}

export function SafeNavAuth() {
  if (!HAS_CLERK) {
    return null;
  }

  return (
    <>
      <Show when="signed-out">
        <Link
          href="/sign-in"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-xs")}
        >
          Sign In
        </Link>
      </Show>
      <Show when="signed-in">
        <UserButton appearance={{ elements: { avatarBox: "h-8 w-8" } }} />
      </Show>
    </>
  );
}
