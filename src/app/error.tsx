"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void error;
  }, [error]);

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 py-12 bg-[#0B0D12] text-[#F2EDE4] text-center">
      <p className="text-xs uppercase tracking-[0.08em] text-[#E5484D] mb-2">
        Hoho.xo · Unexpected Pause
      </p>
      <h1 className="font-[family-name:var(--font-display)] text-4xl font-normal m-0 mb-3">
        Something tripped on the lights.
      </h1>
      <p className="text-sm text-[#9A968D] max-w-md mb-6">
        Your saved notes and tree design remain intact in this browser. Try
        refreshing the view.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <button type="button" className="primary-btn w-auto" onClick={reset}>
          Try again
        </button>
        <Link href="/" className="make-tree-link">
          Home
        </Link>
      </div>
    </main>
  );
}
