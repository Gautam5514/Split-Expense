"use client";

export default function Loader3D({ message }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] gap-3">
      <div className="w-8 h-8 rounded-full border-2 border-border border-t-primary animate-spin" />
      {message && (
        <p className="text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  );
}
