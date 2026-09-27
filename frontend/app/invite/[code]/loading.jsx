import { SkeletonText, SkeletonUi } from "@/components/ui/Skeletons";

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mb-8 flex items-center justify-center gap-2">
          <SkeletonUi className="h-8 w-8 rounded-xl" />
          <SkeletonUi className="h-6 w-22 rounded" />
        </div>

        <SkeletonUi className="rounded-3xl p-8 shadow-xl">
          <div className="flex justify-center mb-6">
            <SkeletonUi className="size-16.5 rounded-full" isChild />
          </div>

          <SkeletonUi
            className="mx-auto h-5 w-55 rounded min-[415px]:mb-8 mb-7"
            isChild
          />

          <div className="flex flex-col items-center mb-6 gap-y-3">
            <div className="min-[415px]:w-75 w-62">
              <SkeletonText width="w-full" isChild />
            </div>
            <div className="min-[415px]:w-60 w-67">
              <SkeletonText width="w-full" isChild />
            </div>
            <div className="min-[415px]:hidden">
              <SkeletonText width="w-6.5" isChild />
            </div>
          </div>

          <div className="flex justify-center pt-1">
            <SkeletonUi className="h-6 w-6 rounded-full" isChild />
          </div>
        </SkeletonUi>
      </div>
    </div>
  );
}
