import { Skeleton } from "@/components/ui/skeleton";

export default function TripLoading() {
  return (
    <div className="h-screen flex flex-col">
      <div className="h-14 border-b flex items-center px-4 gap-3">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-8 w-28" />
      </div>
      <div className="flex-1 flex">
        <div className="w-[380px] border-r p-4 space-y-4 hidden md:block">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <div className="flex-1">
          <Skeleton className="h-full w-full" />
        </div>
      </div>
    </div>
  );
}
