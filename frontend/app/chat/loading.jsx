import {
  SkeletonText,
  SkeletonUi,
  SkeletonAvatar,
} from "@/components/ui/Skeletons";

const SkeletonRow = () => (
  <div className="flex items-center gap-3 w-full">
    <SkeletonAvatar size="size-12.5" isChild />

    <div className="flex-1 space-y-2">
      <div className="flex justify-between">
        <SkeletonUi className="w-1/4 h-4" isChild />
        <SkeletonText width="w-12" isChild />
      </div>
      <div className="flex justify-between items-center">
        <SkeletonText width="w-1/2" isChild />
        <SkeletonAvatar size="size-5" isChild />
      </div>
    </div>
  </div>
);

export default function Loading() {
  return (
    <div className="overflow-hidden bg-background h-[calc(100dvh-96px)] md:h-[calc(100dvh-108px)] px-3 md:px-6 pt-3 pb-20 sm:pb-3">
      <SkeletonUi className="h-full mx-auto flex max-w-[1500px] overflow-hidden rounded-2xl">
        {/* Left side: Friend list */}
        <div className="flex h-full w-full flex-col border-r border-border bg-card md:w-[360px] lg:w-[410px] md:shrink-0">
          {/*Header*/}
          <div className="h-16 px-4 flex items-center justify-between border-b border-border shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <SkeletonAvatar isChild />

              <div className="flex flex-col gap-1 min-w-0">
                <SkeletonText isChild width="w-20" />
                <SkeletonText isChild />
              </div>
            </div>

            <div className="flex gap-5 pr-1.5">
              <SkeletonAvatar size="size-5" isChild />
              <SkeletonAvatar size="size-5" isChild />
              <SkeletonAvatar size="size-5" isChild />
            </div>
          </div>

          <div className="p-3 border-b border-border shrink-0">
            <SkeletonUi
              className="flex gap-1.5 p-3 w-full h-9.5 rounded-xl"
              isChild
            />
          </div>

          <div className="flex-1 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3">
              <SkeletonRow />
            </div>
            <div className="flex items-center gap-3 px-4 py-3">
              <SkeletonRow />
            </div>
            <div className="flex items-center gap-3 px-4 py-3">
              <SkeletonRow />
            </div>
            <div className="flex items-center gap-3 px-4 py-3">
              <SkeletonRow />
            </div>
            <div className="flex items-center gap-3 px-4 py-3">
              <SkeletonRow />
            </div>
            <div className="flex items-center gap-3 px-4 py-3">
              <SkeletonRow />
            </div>
            <div className="flex items-center gap-3 px-4 py-3">
              <SkeletonRow />
            </div>
          </div>
        </div>

        {/* Right side: Chat window */}

        <div className={`h-full flex-1 min-w-0 hidden md:block`}>
          <div className="relative flex-1 hidden md:flex flex-col items-center justify-center h-full">
            <div className="max-w-sm">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl">
                <SkeletonUi className="size-full rounded-[inherit]" isChild />
              </div>
              <div className="flex flex-col items-center gap-3">
                <SkeletonUi className="w-50 h-7" isChild />
                <SkeletonText width="w-95" isChild />
                <SkeletonText width="w-30" isChild />
              </div>
            </div>
            <div className="absolute bottom-8 flex items-center gap-2">
              <SkeletonUi className="w-30 h-2" isChild />
            </div>
          </div>
        </div>
      </SkeletonUi>
    </div>
  );
}
