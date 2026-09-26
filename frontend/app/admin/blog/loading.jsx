import { SkeletonText, SkeletonUi } from "@/components/ui/Skeletons";

const PostRowSkeleton = () => (
  <tr className="border-b last:border-0 border border-border">
    <td className="max-w-70 px-5 py-4.5">
      <div className="space-y-2">
        <SkeletonText width="w-70" isChild />
        <SkeletonText width="w-2/5" isChild />
      </div>
    </td>
    <td className="px-5 py-4.5">
      <SkeletonText width="w-20" isChild />
    </td>
    <td className="px-5 py-4.5">
      <SkeletonUi className="h-6 w-20 rounded-full" isChild />
    </td>
    <td className="px-5 py-4.5">
      <SkeletonText width="w-24" isChild />
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

const TableHeaderSkeleton = () => (
  <thead>
    <tr className="border-b border-white/[0.07] bg-white/1.5">
      {["w-12", "w-18", "w-16", "w-16"].map((width) => (
        <th key={width} className="px-5 py-3.5">
          <SkeletonText width={width} isChild />
        </th>
      ))}
      <th className="px-5 py-3 text-right">
        <div className="flex justify-end">
          <SkeletonText width="w-16" isChild />
        </div>
      </th>
    </tr>
  </thead>
);

export default function Loading() {
  return (
    <div>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-5">
          <SkeletonText width="w-20" />
          <SkeletonUi className="h-6 w-32 mb-4" />
          <SkeletonText width="w-105" />
        </div>
        <SkeletonUi className="h-10 w-29 rounded-lg" />
      </div>

      <SkeletonUi className="overflow-hidden rounded">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <TableHeaderSkeleton />
            <tbody>
              {[0, 1, 2, 3, 4, 5].map((item) => (
                <PostRowSkeleton key={item} />
              ))}
            </tbody>
          </table>
        </div>
      </SkeletonUi>
    </div>
  );
}
