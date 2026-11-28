import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[#0B0D12] px-6 py-12 text-center text-[#F2EDE4]">
      <pre
        aria-hidden="true"
        className="mb-6 text-sm leading-snug text-[#F5C451]"
      >{`      *
     /+\\
    * . +
   / 4 0 4 \\
      |||`}</pre>
      <p className="mb-2 text-xs tracking-[0.08em] text-[#9A968D] uppercase">
        Hoho.xo · Missing Tree
      </p>
      <h1 className="m-0 mb-3 font-[family-name:var(--font-display)] text-4xl font-normal">
        This winter branch isn&apos;t here.
      </h1>
      <p className="mb-6 max-w-md text-sm text-[#9A968D]">
        Double-check the link you opened, or head back to decorate your own 3D
        ASCII Christmas tree.
      </p>
      <Link href="/" className="make-tree-link">
        Back to Hoho.xo Studio →
      </Link>
    </main>
  );
}
