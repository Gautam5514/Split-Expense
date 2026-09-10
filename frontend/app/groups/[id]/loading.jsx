import {
  SkeletonAvatar,
  SkeletonText,
  SkeletonUi,
} from "@/components/ui/Skeletons";

const TabSkeletonRow = () => (
  <div className="flex items-center gap-3 px-5 sm:px-6 py-3.5">
    <SkeletonUi className="size-9 rounded-xl" isChild />

    <div className="flex-1 min-w-0 space-y-2">
      <SkeletonUi className="h-4 w-40" isChild />
      <SkeletonText width="w-32" isChild />
    </div>

    <div className="flex items-center gap-2 shrink-0">
      <SkeletonUi className="h-5 w-11" isChild />
      <SkeletonUi className="h-5 w-9" isChild />
    </div>
  </div>
);

const BalanceSkeletonRow = () => (
  <div className="flex items-center gap-3 px-5 py-3">
    <SkeletonAvatar size="size-7" isChild />

    <div className="flex-1">
      <SkeletonText width="w-32" isChild />
    </div>

    <SkeletonText width="w-13" isChild />
  </div>
);

const MemberSkeletonRow = () => (
  <div className="flex items-center gap-3 px-5 py-3">
    <SkeletonAvatar size="size-9" isChild />

    <div className="flex-1">
      <SkeletonText width="w-32" isChild />
    </div>
  </div>
);

export default function Loading() {
  return (
    <div className="min-h-screen bg-background text-foreground pt-4 sm:pt-6 pb-32 sm:pb-12 px-3 sm:px-4 md:px-6">
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Header */}
        <SkeletonUi
          className={`rounded-xl px-4 py-3.5 sm:px-6 sm:py-4 sm:h-20 h-fit`}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-2">
              <SkeletonUi className="sm:h-7 h-5 w-40" isChild />

              <SkeletonUi className="h-3 w-10" isChild />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <SkeletonUi className="h-8 sm:w-17.5 w-9" isChild />

              <SkeletonUi className="h-8 w-17.5" isChild />
            </div>
          </div>
        </SkeletonUi>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <SkeletonUi className="col-span-2 sm:col-span-1 p-4 sm:p-5 w-full rounded-xl">
            <SkeletonUi className="w-34 h-4 mb-3" isChild />
            <SkeletonUi className="w-20 h-6 mb-4" isChild />
            <SkeletonText width="w-24" isChild />
          </SkeletonUi>

          <SkeletonUi className="w-full rounded-xl p-4 sm:p-5">
            <SkeletonUi className="w-30 h-4 mb-1" isChild />
            <SkeletonUi className="w-20 h-4 mb-3" isChild />
            <SkeletonUi className="w-30 h-6 mb-4" isChild />
            <SkeletonText width="w-24" isChild />
          </SkeletonUi>

          <SkeletonUi className="w-full rounded-xl p-4 sm:p-5">
            <SkeletonUi className="w-31 h-4 mb-3" isChild />
            <SkeletonUi className="w-34 h-6 mb-4" isChild />

            <div className="flex items-center justify-between gap-2">
              <div className="flex -space-x-2">
                <SkeletonAvatar size="size-5.5" isChild />
                <SkeletonAvatar size="size-5.5" isChild />
                <SkeletonAvatar size="size-5.5" isChild />
              </div>

              <SkeletonText width="w-12" isChild />
            </div>
          </SkeletonUi>
        </div>

        {/* Two column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-5">
          {/* Left Side: Tab content and bar container */}
          <div className="space-y-4">
            {/* Tab bar */}
            <div className="overflow-hidden">
              <SkeletonUi className="flex items-center gap-6 rounded-xl p-1.5 shadow-sm w-max min-w-full sm:w-fit">
                <SkeletonUi className="h-9 w-35 rounded-lg" isChild />

                <SkeletonText width="w-29" isChild />

                <div className="sm:hidden block">
                  <SkeletonText width="w-29" isChild />
                </div>
              </SkeletonUi>
            </div>

            {/* Tab content */}
            <SkeletonUi className="rounded-2xl">
              <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border">
                <SkeletonUi className="h-5 w-35" isChild />

                <SkeletonUi className="h-8 w-33 rounded-lg" isChild />
              </div>

              <TabSkeletonRow />
              <TabSkeletonRow />
              <TabSkeletonRow />
              <TabSkeletonRow />
              <TabSkeletonRow />
            </SkeletonUi>
          </div>

          {/* Right Side: Group info */}
          <div className="hidden lg:flex flex-col gap-5">
            {/* Group Balance */}
            <SkeletonUi className="rounded-2xl">
              <div className="flex items-center justify-between p-5 border-b border-border">
                <SkeletonUi className="h-5 w-32" isChild />

                <SkeletonUi className="h-5 w-12 rounded-full" isChild />
              </div>

              <BalanceSkeletonRow />
              <BalanceSkeletonRow />

              <div className="border-t border-border px-5 py-4 space-y-3">
                <SkeletonText width="w-32" isChild />

                <SkeletonUi
                  className="rounded-xl p-3.5 space-y-2.5 h-20"
                  isChild
                ></SkeletonUi>
              </div>
            </SkeletonUi>

            {/* Group Members */}
            <SkeletonUi className="rounded-2xl">
              <div className="p-5 border-b border-border">
                <SkeletonUi className="h-5 w-32" isChild />
              </div>

              <MemberSkeletonRow />
              <MemberSkeletonRow />

              <MemberSkeletonRow />
              <div className="px-5 py-4 space-y-2.5 border-t border-border">
                <SkeletonUi
                  className="rounded-xl p-3.5 space-y-2.5 h-11"
                  isChild
                />
              </div>
            </SkeletonUi>
          </div>
        </div>
      </div>
    </div>
  );
}
