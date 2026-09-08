export const SkeletonUi = ({ className, isChild, children }) => (
  <div
    className={`${isChild ? "bg-zinc-800" : "bg-muted/80"} ${!isChild && "animate-pulse"} rounded ${className}`}
  >
    {children}
  </div>
);

export const SkeletonAvatar = ({ size = "w-10 h-10", isChild }) => (
  <SkeletonUi className={`${size} rounded-full`} isChild={isChild} />
);

export const SkeletonText = ({ width = "w-3/4", isChild }) => (
  <SkeletonUi className={`h-3 ${width}`} isChild={isChild} />
);

export const SkeletonRow = () => (
  <div className="flex items-center gap-3 p-3">
    <SkeletonAvatar isChild />
    <div className="flex-1 space-y-2">
      <SkeletonText width="w-1/2" isChild />
      <SkeletonText width="w-1/3" isChild />
    </div>
  </div>
);
