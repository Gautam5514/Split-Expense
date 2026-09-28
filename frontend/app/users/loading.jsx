import {
  SkeletonAvatar,
  SkeletonText,
  SkeletonUi,
} from "../../components/ui/Skeletons";

const CardSkeleton = () => (
  <SkeletonUi className="w-full rounded-xl">
    <div className="flex-1 p-5 relative">
      <div className="flex items-start justify-between gap-3 pr-7 mb-4">
        <div className="flex items-center gap-3">
          <SkeletonUi className="size-11 rounded" isChild />
          <div className="min-w-0 pt-0.5 pr-16 space-y-2">
            <SkeletonUi className="w-24 h-4" isChild />
            <SkeletonUi className={"w-15 h-2"} isChild />
          </div>
        </div>

        <SkeletonUi className="w-15 h-5 rounded-full" isChild />
      </div>
      <div className="flex items-center gap-2.5 mt-5">
        <div className="flex -space-x-2.5">
          <SkeletonAvatar size="size-6" isChild />
          <SkeletonAvatar size="size-6" isChild />
          <SkeletonAvatar size="size-6" isChild />
        </div>

        <SkeletonUi className={"w-15 h-2"} isChild />
      </div>

      <SkeletonUi className="size-3 absolute right-5 bottom-9" isChild />
    </div>
  </SkeletonUi>
);

const StatCardSkeleton = () => {
  return (
    <SkeletonUi className={"h-31 rounded-xl p-4 sm:p-5"}>
      <div className="flex items-start justify-between">
        <div className="space-y-3 mt-1">
          <SkeletonUi className={"h-2.5 w-17"} isChild />

          <SkeletonUi className={"h-5.5 w-18"} isChild />
        </div>

        <SkeletonUi className="size-9 rounded-xl" isChild />
      </div>

      <SkeletonUi className={"mt-5.5 h-2.5 w-26"} isChild />
    </SkeletonUi>
  );
};

export default function Loading() {
  return (
    <div className="min-h-screen bg-background pb-28 sm:pb-12 pt-4 sm:pt-6 px-3 sm:px-4 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <SkeletonUi className={"h-7 w-30"} />
          <SkeletonUi className={"h-12 w-83"} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-4">
          <SkeletonUi className="lg:col-span-3 rounded-xl p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div className="">
                <SkeletonUi className={"h-4 w-45 my-1"} isChild />

                <SkeletonUi className={"h-2.5 w-69 mt-2"} isChild />
              </div>

              <SkeletonUi
                className={"h-5.5 w-30 rounded-full hidden sm:flex"}
                isChild
              />
            </div>

            <div className="h-43 sm:h-54 w-full relative">
              <div className="h-[108%] flex items-end justify-between pl-2">
                <SkeletonUi className={"h-2.5 w-12"} isChild />
                <SkeletonUi className={"h-2.5 w-12"} isChild />
                <SkeletonUi className={"h-2.5 w-12"} isChild />
                <SkeletonUi className={"h-2.5 w-12"} isChild />
              </div>
              <div className="absolute inset-y-0 right-0 left-5 flex flex-col justify-between pointer-events-none opacity-40">
                <div className="border-t border-dashed border-[rgba(250,250,250,0.2)] w-full"></div>
                <div className="border-t border-dashed border-[rgba(250,250,250,0.2)] w-full"></div>
                <div className="border-t border-dashed border-[rgba(250,250,250,0.2)] w-full"></div>
                <div className="border-t border-dashed border-[rgba(250,250,250,0.2)] w-full"></div>
                <div className="border-t border-dashed border-[rgba(250,250,250,0.2)] w-full"></div>
              </div>

              {/* SVG Area Chart Fill & Line */}
              <svg
                className="absolute inset-0 w-full h-full text-gray-200 overflow-visible"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                {/* Filled Area: Light gray gradient/opacity simulation */}
                <path
                  d="M 2.5 100 L 2.5 70 Q 20 40 35 60 T 70 30 T 100 45 L 100 100 Z"
                  fill="url(#sk-id)"
                  fillOpacity="0.4"
                />
                <defs>
                  <linearGradient id="sk-id" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="80%"
                      stopColor="rgba(70,70,70)"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="100%"
                      stopColor="rgba(50,50,50,0.1)"
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                </defs>
                {/* Stroke Line: Slightly darker gray path */}
                <path
                  d="M 2.5 70 Q 20 40 35 60 T 70 30 T 100 45"
                  fill="none"
                  stroke="rgba(250,250,250,0.1)"
                  strokeWidth="0.2"
                />
              </svg>
            </div>

            {/* X-Axis Labels */}
            <div className="flex justify-between items-center pt-3 px-1"></div>
          </SkeletonUi>

          <SkeletonUi className="lg:col-span-2 rounded-xl p-5 sm:p-6 shadow-sm">
            <div className="mb-8">
              <SkeletonUi className={"h-4 w-45 my-1"} isChild />

              <SkeletonUi className={"h-2.5 w-55 mt-2"} isChild />
            </div>

            <div className="w-full sm:h-63 h-43">
              <div className="grid grid-cols-2 items-center pt-3">
                <div className="h-fit mr-1">
                  <SkeletonUi
                    className="mx-auto border-20 border-muted rounded-full size-35 bg-transparent flex flex-col items-center justify-center gap-y-1"
                    isChild
                  >
                    <SkeletonUi className={"h-2 w-10"} isChild />
                    <SkeletonUi className={"h-3 w-14"} isChild />
                  </SkeletonUi>
                </div>

                <div className="space-y-4 pl-1">
                  <div className="flex justify-between">
                    <div className="flex gap-x-2">
                      <SkeletonAvatar size="size-2.5" isChild />

                      <SkeletonUi className={"w-20 h-2"} isChild />
                    </div>
                    <SkeletonUi className={"w-5 h-2"} isChild />
                  </div>
                  <div className="flex justify-between">
                    <div className="flex gap-x-2">
                      <SkeletonAvatar size="size-2.5" isChild />

                      <SkeletonUi className={"w-20 h-2"} isChild />
                    </div>
                    <SkeletonUi className={"w-5 h-2"} isChild />
                  </div>
                  <div className="flex justify-between">
                    <div className="flex gap-x-2">
                      <SkeletonAvatar size="size-2.5" isChild />

                      <SkeletonUi className={"w-20 h-2"} isChild />
                    </div>
                    <SkeletonUi className={"w-5 h-2"} isChild />
                  </div>
                  <div className="flex justify-between">
                    <div className="flex gap-x-2">
                      <SkeletonAvatar size="size-2.5" isChild />

                      <SkeletonUi className={"w-20 h-2"} isChild />
                    </div>
                    <SkeletonUi className={"w-5 h-2"} isChild />
                  </div>
                </div>
              </div>
            </div>
          </SkeletonUi>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <SkeletonUi className={"h-5 w-53 my-1"} />

              <SkeletonUi className={"h-2 w-60 mt-3"} />
            </div>

            <SkeletonText width="w-17" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}
