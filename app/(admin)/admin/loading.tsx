import { Skeleton } from "@/components/ui/skeleton";

/** Shown instantly while an admin page loads, so sidebar navigation never looks frozen. */
export default function AdminLoading() {
  return (
    <div className="space-y-6 pb-8" aria-busy="true" aria-label="Loading">
      <div className="space-y-3 border-b pb-6">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-10 w-72 max-w-full" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );
}
