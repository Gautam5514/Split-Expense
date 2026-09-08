import { SkeletonText } from "@/components/ui/skeletons/rectangle";
import { SkeletonUi } from "@/components/ui/skeletons/rectangle";
import { SkeletonAvatar } from "../../components/ui/skeletons/rectangle";

const CardSkeleton = () => (
  <SkeletonUi className="w-full h-45 rounded-lg">
    <div className="flex-1 p-5 space-y-4">
      <div className="flex items-end gap-3">
        <SkeletonUi className="size-9 rounded-lg" isChild />
        <div className="min-w-0 pt-0.5 pr-16 space-y-2">
          <SkeletonText width="w-24" isChild />
          <SkeletonUi className={"w-15 h-2"} isChild />
        </div>
      </div>
      <div className="flex items-center gap-2.5 mt-5">
        <div className="flex -space-x-2.5">
          <SkeletonAvatar size="size-9" isChild />
          <SkeletonAvatar size="size-9" isChild />
          <SkeletonAvatar size="size-9" isChild />
        </div>

        <SkeletonUi className={"w-15 h-2"} isChild />
      </div>
    </div>
    <div
      className={`border-t border-black px-5 py-3 flex items-center justify-between`}
    >
      <SkeletonText width="w-35" isChild />
      <SkeletonText width="w-15" isChild />
    </div>
  </SkeletonUi>
);

export default function Loading() {
  return (
    <div className="min-h-screen bg-background pt-8 pb-32 sm:pb-12 px-3 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <SkeletonUi className={"w-30 h-10"} />
            <SkeletonText width="w-80" />
          </div>

          <SkeletonUi className={"w-33 h-12.5 rounded-xl"} />
        </div>

        <div className="flex items-center gap-4 sm:gap-6 border-b border-border pb-4">
          <SkeletonText width="w-20" />

          <SkeletonText width="w-20" />
        </div>

        <div className="space-y-8">
          <SkeletonUi className={"w-24 h-5 mb-4"} />

          <div className="grid gap-4 sm:grid-cols-2">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}
