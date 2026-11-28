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
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[#0B0D12] px-6 py-12 text-center text-[#F2EDE4]">
      <p className="mb-2 text-xs tracking-[0.08em] text-[#E5484D] uppercase">
        Hoho.xo · Unexpected Pause
      </p>
      <h1 className="m-0 mb-3 font-[family-name:var(--font-display)] text-4xl font-normal">
        Something tripped on the lights.
      </h1>
      <p className="mb-6 max-w-md text-sm text-[#9A968D]">
        Your saved notes and tree design remain intact in this browser. Try
        refreshing the view.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
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
