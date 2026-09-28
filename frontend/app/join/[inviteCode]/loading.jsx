import { SkeletonText, SkeletonUi } from "@/components/ui/Skeletons";

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mb-8 flex items-center justify-center gap-2">
          <SkeletonUi className="h-8 w-8 rounded-xl" />
          <SkeletonUi className="h-6 w-22 rounded" />
        </div>

        <SkeletonUi className="rounded-3xl p-8 shadow-xl pb-10">
          <div className="flex justify-center mb-6">
            <SkeletonUi className="size-16.5 rounded-full" isChild />
          </div>

          <SkeletonUi
            className="mx-auto h-5 w-30 rounded min-[425px]:mb-4 mb-3"
            isChild
          />

          <div className="flex flex-col items-center mb-6 gap-y-3">
            <div className="min-[425px]:w-75 w-67">
              <SkeletonText width="w-full" isChild />
            </div>
            <div className="min-[425px]:w-60 w-68">
              <SkeletonText width="w-full" isChild />
            </div>
          </div>

          <div className="flex flex-col items-center w-full gap-3 mb-6">
            <SkeletonUi className="w-full h-10 rounded-xl" isChild />
            <SkeletonUi className="w-full h-10.5 rounded-xl" isChild />
          </div>

          <div className="flex flex-col items-center gap-y-2">
            <SkeletonUi className="h-2 w-full" isChild />
            <SkeletonUi className="h-2 w-10 min-[425px]:hidden" isChild />
          </div>
        </SkeletonUi>
      </div>
    </div>
  );
}
