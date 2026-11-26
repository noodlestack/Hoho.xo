import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Notice — Hoho.xo",
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12 font-sans text-sm leading-relaxed text-[#F6F2E9]">
      <p className="mb-3 inline-block rounded border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 font-mono text-xs uppercase tracking-wide text-amber-200">
        DRAFT, pending legal review
      </p>
      <h1 className="mb-6 font-display text-3xl tracking-tight">
        Hoho.xo Privacy Notice
      </h1>

      <section className="space-y-4 text-[#F6F2E9]/85">
        <div>
          <h2 className="mb-1 text-base font-semibold text-[#F6F2E9]">
            What anonymity means here
          </h2>
          <p>
            Notes submitted to a tree are anonymous to the tree owner. We do not
            collect sign-ins from visitors or provide sender-identity hints,
            sender analytics, or reveal features. However, notes and transport
            requests pass through this service and its underlying hosting and
            database providers (such as Vercel and Upstash, depending on how this
            instance is deployed).
          </p>
        </div>

        <div>
          <h2 className="mb-1 text-base font-semibold text-[#F6F2E9]">
            Rate limiting and IP hashes
          </h2>
          <p>
            To prevent spam and abusive traffic, incoming requests are checked
            against rate limits using a salted cryptographic HMAC-SHA256 hash of
            the client IP address. Raw client IP addresses are not stored or
            logged by application code.
          </p>
        </div>

        <div>
          <h2 className="mb-1 text-base font-semibold text-[#F6F2E9]">
            Data storage and deletion
          </h2>
          <p>
            Tree configuration and submitted notes remain stored in the configured
            backend until the tree owner deletes individual notes from Mail or
            the operator clears storage. Public tree responses omit message
            bodies, read timestamps, and muted word lists.
          </p>
        </div>

        <div>
          <h2 className="mb-1 text-base font-semibold text-[#F6F2E9]">
            Moderation
          </h2>
          <p>
            Local safety checks run before saving notes. If the operator enables
            optional third-party moderation on this instance, submitted note
            text is sent to OpenAI&apos;s moderation endpoint strictly for safety
            classification.
          </p>
        </div>

        <div>
          <h2 className="mb-1 text-base font-semibold text-[#F6F2E9]">
            Intended audience
          </h2>
          <p>
            Hoho.xo is intended for users aged 13 and older (pending final legal
            review).
          </p>
        </div>
      </section>

      <div className="mt-8 border-t border-white/10 pt-4 font-mono text-xs text-[#F6F2E9]/70">
        <Link href="/" className="underline hover:text-[#F6F2E9]">
          Back to Hoho.xo
        </Link>
        {" · "}
        <Link href="/terms" className="underline hover:text-[#F6F2E9]">
          Terms
        </Link>
      </div>
    </main>
  );
}
