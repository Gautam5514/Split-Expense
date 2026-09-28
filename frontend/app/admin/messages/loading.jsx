import {
  SkeletonAvatar,
  SkeletonText,
  SkeletonUi,
} from "@/components/ui/Skeletons";

const MessageRowSkeleton = () => (
  <div className="flex items-start gap-3 border-b border-white/5 pl-8 pr-2.5 py-4">
    <div className="-mt-1">
      <SkeletonAvatar size="size-9.5" isChild />
    </div>
    <div className="min-w-0 flex-1 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <SkeletonText width="w-2/5" isChild />
        <SkeletonUi className="w-8 h-2" isChild />
      </div>
      <SkeletonUi className="w-16 h-2" isChild />
      <SkeletonUi className="w-4/5 h-2" isChild />
    </div>
  </div>
);

const DetailSkeleton = () => (
  <SkeletonUi className="hidden min-w-0 flex-1 flex-col overflow-hidden rounded-2xl sm:flex items-center justify-center">
    <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-2xl">
      <SkeletonUi className="size-full rounded-[inherit]" isChild />
    </div>
    <div className="flex flex-col items-center gap-3">
      <SkeletonUi className="w-30 h-3" isChild />
      <div className="flex flex-col items-center">
        <SkeletonText width="w-75 mb-2" isChild />
        <SkeletonText width="w-55" isChild />
      </div>
    </div>
  </SkeletonUi>
);

export default function Loading() {
  return (
    <div>
      <div className="mb-5 space-y-2.5">
        <div className="mb-5">
          <SkeletonText width="w-27" />
        </div>
        <SkeletonUi className="h-6 w-56 mb-4" />
        <SkeletonText width="w-82" />
      </div>

      <div className="flex gap-4 sm:h-[calc(100dvh-12rem)]">
        <SkeletonUi className="flex h-full w-full min-w-0 flex-col overflow-hidden rounded-2xl sm:w-82.5 sm:shrink-0 lg:w-95">
          <div className="border-b border-white/[0.07] p-2.5">
            <SkeletonUi className="mb-2.5 h-9 w-full rounded-lg" isChild />
            <div className="grid grid-cols-3 gap-1 items-center">
              <SkeletonUi className={`h-8 flex-1 rounded-lg`} isChild />

              {["w-17", "w-18"].map((width) => (
                <SkeletonUi
                  key={width}
                  className={`h-2 flex-1 rounded-lg mx-auto ${width}`}
                  isChild
                />
              ))}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            {[0, 1, 2, 3, 4, 5].map((item) => (
              <MessageRowSkeleton key={item} />
            ))}
          </div>
        </SkeletonUi>

        <DetailSkeleton />
      </div>
    </div>
  );
}
