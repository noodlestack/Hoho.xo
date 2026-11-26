import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 py-12 bg-[#0B0D12] text-[#F2EDE4] text-center">
      <pre
        aria-hidden="true"
        className="text-[#F5C451] text-sm leading-snug mb-6"
      >{`      *
     /+\\
    * . +
   / 4 0 4 \\
      |||`}</pre>
      <p className="text-xs uppercase tracking-[0.08em] text-[#9A968D] mb-2">
        Hoho.xo · Missing Tree
      </p>
      <h1 className="font-[family-name:var(--font-display)] text-4xl font-normal m-0 mb-3">
        This winter branch isn&apos;t here.
      </h1>
      <p className="text-sm text-[#9A968D] max-w-md mb-6">
        Double-check the link you opened, or head back to decorate your own
        3D ASCII Christmas tree.
      </p>
      <Link href="/" className="make-tree-link">
        Back to Hoho.xo Studio →
      </Link>
    </main>
  );
}
