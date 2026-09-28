import {
  SkeletonAvatar,
  SkeletonText,
  SkeletonUi,
} from "../../components/ui/Skeletons";

export default function Loading(second) {
  return (
    <div className="min-h-screen bg-background pt-8 pb-28 sm:pb-20 px-3 sm:px-4 lg:px-6">
      <div className="max-w-2xl md:max-w-3xl lg:max-w-6xl mx-auto lg:space-y-4 space-y-5">
        <div>
          <SkeletonUi className={"lg:w-37 w-30 lg:h-8 h-6.5 mt-1 mb-2"} />
          <SkeletonText width="w-56" />
        </div>

        <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(360px,420px)] lg:gap-5 lg:items-start">
          <SkeletonUi className="min-w-0 lg:col-start-1 rounded-2xl overflow-hidden">
            <SkeletonUi className={"h-24 sm:h-28 lg:h-33"} isChild />
            <div className="px-4 sm:px-7 pb-6">
              <div className="flex items-end justify-between -mt-10 sm:-mt-12">
                <SkeletonUi
                  className="w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 rounded-2xl ring-4 ring-card flex items-center justify-center relative"
                  isChild
                >
                  <SkeletonUi
                    className="absolute -bottom-1.5 -right-2 size-8 text-background rounded-xl bg-muted"
                    isChild
                  />
                </SkeletonUi>

                <SkeletonUi className="rounded-xl h-8 w-28" isChild />
              </div>

              <div className="mt-3 space-y-2">
                <SkeletonUi className="w-23 h-5.5" isChild />
                <SkeletonText width="w-43" isChild />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <SkeletonUi className="w-30 h-6.5 rounded-full" isChild />
                <SkeletonUi className="w-23 h-6.5 rounded-full" isChild />
                <SkeletonUi className="w-17 h-6.5 rounded-full" isChild />
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <SkeletonUi className="w-38 h-2.5" isChild />
                  <SkeletonUi className="w-5 h-2.5" isChild />
                </div>

                <SkeletonUi className="w-full sm:h-1.5 h-2 mt-2" isChild />

                <div className="mt-3">
                  <SkeletonUi className="max-[420px]:w-73 w-83 h-2" isChild />
                  <SkeletonUi
                    className="w-11 h-2 max-[420px]:block hidden mt-2"
                    isChild
                  />
                </div>
              </div>
            </div>
          </SkeletonUi>

          <div className="min-w-0 lg:col-start-2 lg:row-start-1 lg:row-span-2">
            <div className="space-y-4">
              <SkeletonUi className="rounded-xl p-6 space-y-5 pb-7">
                <SkeletonUi className="h-4 w-44 mt-1.5 ml-1" isChild />

                <SkeletonUi className="rounded-2xl h-42" isChild />

                <SkeletonUi className="rounded-2xl h-28" isChild />

                <div>
                  <div className="grid grid-cols-3 gap-3">
                    <SkeletonUi className="h-10 rounded-xl" isChild />
                    <SkeletonUi className="h-10 rounded-xl" isChild />
                    <SkeletonUi className="h-10 rounded-xl" isChild />
                  </div>

                  <div className="mt-3">
                    <SkeletonUi className="w-[95%] mx-auto h-2" isChild />
                    <SkeletonUi
                      className="lg:hidden w-20 mx-auto h-2 mt-2"
                      isChild
                    />
                  </div>
                </div>
              </SkeletonUi>

              <SkeletonUi className="rounded-xl p-6 space-y-4">
                <SkeletonUi className="h-4 w-23 mt-1" isChild />

                <div className="flex items-center justify-between mt-5">
                  <SkeletonText width="w-17" isChild />

                  <SkeletonUi className="w-28 h-2" isChild />
                </div>

                <SkeletonUi className="w-full h-2" isChild />

                <div className="flex flex-wrap gap-1.5">
                  <SkeletonUi className="w-25 h-5 rounded-full" isChild />
                  <SkeletonUi className="w-20 h-5 rounded-full" isChild />
                </div>
              </SkeletonUi>

              <SkeletonUi className="rounded-xl py-8 px-6 space-y-4">
                <SkeletonUi className="h-4 w-34" isChild />

                <div className="divide-y divide-border">
                  <div className="py-3 flex items-center gap-3">
                    <SkeletonAvatar size="size-10" isChild />

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <SkeletonText width="w-16" isChild />
                        <SkeletonUi
                          className="rounded-full w-22 h-5.5"
                          isChild
                        />
                      </div>

                      <SkeletonUi className="h-2 w-23" isChild />

                      <SkeletonUi className="h-2 w-23 mt-3" isChild />
                    </div>
                  </div>

                  <div className="py-3 flex items-center gap-3">
                    <SkeletonAvatar size="size-10" isChild />

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <SkeletonText width="w-16" isChild />
                        <SkeletonUi
                          className="rounded-full w-22 h-5.5"
                          isChild
                        />
                      </div>

                      <SkeletonUi className="h-2 w-23" isChild />

                      <SkeletonUi className="h-2 w-23 mt-3" isChild />
                    </div>
                  </div>
                </div>
              </SkeletonUi>
            </div>
          </div>

          <div className="h-132 min-w-0 lg:col-start-1">
            <SkeletonUi className="rounded-2xl shadow-sm p-5 sm:p-6 sm:space-y-5 space-y-5.5">
              <div className="flex items-center gap-2">
                <SkeletonUi className="size-8.5 rounded-lg" isChild />
                <SkeletonUi className="h-4 w-40 mt-1" isChild />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="flex flex-col gap-2">
                  <SkeletonText width="w-16" isChild />

                  <SkeletonUi className="w-full rounded-xl h-10.5" isChild />
                </div>

                <div className="flex flex-col gap-2">
                  <SkeletonText width="w-16" isChild />

                  <SkeletonUi className="w-full rounded-xl h-10.5" isChild />
                </div>

                <div className="flex flex-col gap-2">
                  <SkeletonText width="w-16" isChild />

                  <SkeletonUi className="w-full rounded-xl h-10.5" isChild />
                </div>

                <div className="flex flex-col gap-2">
                  <SkeletonText width="w-16" isChild />

                  <SkeletonUi className="w-full rounded-xl h-10.5" isChild />
                </div>

                <div className="flex flex-col gap-2">
                  <SkeletonText width="w-16" isChild />

                  <SkeletonUi className="w-full rounded-xl h-10.5" isChild />
                </div>

                <div className="flex flex-col gap-2">
                  <SkeletonText width="w-16" isChild />

                  <SkeletonUi className="w-full rounded-xl h-10.5" isChild />
                </div>

                <div className="flex flex-col gap-2">
                  <SkeletonText width="w-16" isChild />

                  <SkeletonUi className="w-full rounded-xl h-10.5" isChild />
                </div>

                <div className="flex flex-col gap-2">
                  <SkeletonText width="w-16" isChild />

                  <SkeletonUi className="w-full rounded-xl h-10.5" isChild />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <SkeletonText width="w-16" isChild />

                <SkeletonUi className="w-full rounded-xl h-20" isChild />
              </div>
            </SkeletonUi>
          </div>
        </div>
      </div>
    </div>
  );
}
