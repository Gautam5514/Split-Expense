import { SkeletonText, SkeletonUi } from "@/components/ui/Skeletons";

const JobRowSkeleton = () => (
  <tr className="border-b border-white/5 last:border-0">
    <td className="px-5 py-4.5">
      <div className="space-y-2">
        <SkeletonText width="w-40" isChild />
        <SkeletonText width="w-20" isChild />
      </div>
    </td>
    <td className="px-5 py-4.5">
      <SkeletonText width="w-24" isChild />
    </td>
    <td className="px-5 py-4.5">
      <SkeletonText width="w-28" isChild />
    </td>
    <td className="px-5 py-4.5">
      <SkeletonUi className="h-5 w-16 rounded-full" isChild />
    </td>
    <td className="px-5 py-4.5">
      <div className="flex items-center justify-end gap-1.5">
        <SkeletonUi className="h-8 w-8 rounded-lg" isChild />
        <SkeletonUi className="h-8 w-8 rounded-lg" isChild />
        <SkeletonUi className="h-8 w-8 rounded-lg" isChild />
      </div>
    </td>
  </tr>
);

export default function Loading() {
  return (
    <div>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2.5">
          <div className="mb-5">
            <SkeletonText width="w-24" />
          </div>
          <SkeletonUi className="h-6 w-25 mb-4" />
          <SkeletonText width="w-75" />
        </div>

        <div className="flex items-center gap-2">
          <SkeletonUi className="h-10 w-40 rounded-lg" />
          <SkeletonUi className="h-10 w-26 rounded-lg" />
        </div>
      </div>

      <SkeletonUi className="overflow-hidden rounded">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.07] bg-white/1.5">
                {["w-12", "w-18", "w-16", "w-16"].map((width) => (
                  <th key={width} className="px-5 py-3">
                    <SkeletonText width={width} isChild />
                  </th>
                ))}
                <th className="px-5 py-3.5 text-right">
                  <div className="flex justify-end">
                    <SkeletonText width="w-16" isChild />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {[0, 1, 2, 3, 4, 5].map((item) => (
                <JobRowSkeleton key={item} />
              ))}
            </tbody>
          </table>
        </div>
      </SkeletonUi>
    </div>
  );
}
