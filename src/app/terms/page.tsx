import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — Hoho.xo",
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12 font-sans text-sm leading-relaxed text-[#F6F2E9]">
      <p className="mb-3 inline-block rounded border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 font-mono text-xs uppercase tracking-wide text-amber-200">
        DRAFT, pending legal review
      </p>
      <h1 className="mb-6 font-display text-3xl tracking-tight">
        Hoho.xo Terms of Service
      </h1>

      <section className="space-y-4 text-[#F6F2E9]/85">
        <div>
          <h2 className="mb-1 text-base font-semibold text-[#F6F2E9]">
            Eligibility
          </h2>
          <p>
            This service is intended for users aged 13 and older (pending final
            legal review).
          </p>
        </div>

        <div>
          <h2 className="mb-1 text-base font-semibold text-[#F6F2E9]">
            Acceptable use
          </h2>
          <p>
            Do not send threats, harassment, doxxing, phone numbers, email
            addresses, malicious links, or sexually explicit content. Notes
            must only represent real human submissions; automated spamming or
            flooding is prohibited.
          </p>
        </div>

        <div>
          <h2 className="mb-1 text-base font-semibold text-[#F6F2E9]">
            Owner keys and retention
          </h2>
          <p>
            Tree ownership is controlled by a secret Owner Access Key shown once
            at handle creation and an HttpOnly browser cookie. Keep your key if
            you want to unlock Mail on another device. Notes remain stored until
            deleted by the tree owner or purged by the instance operator.
          </p>
        </div>

        <div>
          <h2 className="mb-1 text-base font-semibold text-[#F6F2E9]">
            Privacy and moderation disclosure
          </h2>
          <p>
            Notes are anonymous to the tree owner, not necessarily to the
            service or hosting providers. Salted IP hashes are used for rate
            limiting, and optional third-party moderation (OpenAI) may screen
            submitted note text only when enabled by the operator.
          </p>
        </div>
      </section>

      <div className="mt-8 border-t border-white/10 pt-4 font-mono text-xs text-[#F6F2E9]/70">
        <Link href="/" className="underline hover:text-[#F6F2E9]">
          Back to Hoho.xo
        </Link>
        {" · "}
        <Link href="/privacy" className="underline hover:text-[#F6F2E9]">
          Privacy
        </Link>
      </div>
    </main>
  );
}
