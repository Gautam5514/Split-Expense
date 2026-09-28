import { SkeletonText, SkeletonUi } from "../../components/ui/Skeletons";

const SettingRowSkeleton = ({ labelWidth, contentWidth }) => {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <SkeletonText width="w-28" isChild />
      <SkeletonUi className="w-29 h-10.5" isChild />
    </div>
  );
};

export default function Loading() {
  return (
    <div className="min-h-screen bg-background pt-8 pb-28 sm:pb-20 px-3 sm:px-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="space-y-3">
          <SkeletonUi className="h-6 w-25 mt-1" />

          <SkeletonText width="w-63" />
        </div>
        <SkeletonUi className="rounded-xl">
          <div className="px-5 pt-7 pb-3.5 flex items-center gap-2 border-b border-border">
            <SkeletonUi className="h-4 w-45" isChild />
          </div>

          <div className="divide-y divide-border">
            <div className="flex items-center justify-between gap-4 px-5 py-4">
              <SkeletonText width="w-28" isChild />
              <SkeletonUi className="w-29 h-9.5" isChild />
            </div>

            <div className="flex items-center justify-between gap-4 px-5 py-4">
              <div>
                <SkeletonUi className="w-8 min-[460px]:w-22 h-3" isChild />
                <SkeletonUi
                  className="w-14 min-[460px]:hidden h-3 mt-3"
                  isChild
                />
              </div>
              <SkeletonUi className="w-70 h-8.5" isChild />
            </div>

            <div className="flex items-center justify-between gap-4 px-5 py-5 pb-6">
              <SkeletonText width="w-25" isChild />
              <SkeletonUi className="w-11.5 h-6 rounded-full -mt-1" isChild />
            </div>
          </div>
        </SkeletonUi>

        <SkeletonUi className="rounded-xl">
          <div className="px-5 pt-6.5 pb-4 flex items-center gap-2 border-b border-border ml-1">
            <SkeletonUi className="h-4 w-21.5" isChild />
          </div>

          <div className="divide-y divide-border">
            <div className="flex items-center justify-between gap-4 px-5 py-4">
              <SkeletonText width="w-16" isChild />
              <SkeletonUi className="w-35 h-9.5" isChild />
            </div>

            <div className="flex items-center justify-between gap-4 px-5 py-4">
              <SkeletonText width="w-44" isChild />
              <div className="flex gap-2 items-center">
                <SkeletonUi className="w-16 h-5 rounded-full" isChild />
                <SkeletonUi className="w-11 h-6 rounded-full" isChild />
              </div>
            </div>
          </div>
        </SkeletonUi>

        <SkeletonUi className="rounded-xl">
          <div className="px-5 pt-6.5 pb-4 flex items-center gap-2 border-b border-border ml-1">
            <SkeletonUi className="h-4 w-51" isChild />
          </div>

          <div className="divide-y divide-border">
            <div className="flex items-center justify-between gap-4 px-5 py-4">
              <SkeletonText width="w-25" isChild />
              <SkeletonUi className="w-40 h-9.5" isChild />
            </div>

            <div className="flex items-center justify-between gap-4 px-5 py-4">
              <SkeletonText width="w-20" isChild />
              <SkeletonUi className="w-42 h-9.5" isChild />
            </div>
          </div>
        </SkeletonUi>

        <SkeletonUi className="rounded-xl">
          <div className="px-5 pt-7 pb-4 flex flex-col gap-4 border-b border-border">
            <SkeletonUi className="h-4 w-35" isChild />

            <div>
              <SkeletonUi className="h-2 min-[415px]:w-82 w-70" isChild />
              <SkeletonUi
                className="w-11 min-[460px]:hidden h-2 mt-2"
                isChild
              />
            </div>
          </div>

          <div className="divide-y divide-border">
            <div className="flex items-center justify-between gap-4 px-5 py-4">
              <SkeletonText width="w-32" isChild />
              <SkeletonUi className="w-42 h-9.5" isChild />
            </div>

            <div className="flex items-center justify-between gap-4 px-5 py-4">
              <SkeletonText width="w-26" isChild />
              <SkeletonUi className="w-56 h-9.5" isChild />
            </div>
          </div>
        </SkeletonUi>
      </div>
    </div>
  );
}
