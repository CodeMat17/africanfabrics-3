import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function OrdersLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-4 w-36" />
        </div>
      </div>

      {/* Search + filters */}
      <div className="space-y-3">
        <Skeleton className="h-10 w-full rounded-md" />
        <div className="flex gap-2 flex-wrap">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-20 rounded-full" />
          ))}
        </div>
      </div>

      {/* Order cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <Card key={i} className="border-border/60">
            <CardHeader className="pb-3">
              <div className="flex justify-end">
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-8 w-full rounded-lg" />
              <div className="flex items-center justify-between pt-1">
                <Skeleton className="h-6 w-24 rounded-md" />
                <Skeleton className="h-7 w-16 rounded-md" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
