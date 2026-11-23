"use client";

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div className="route-transition min-w-0">
      {children}
    </div>
  );
}
