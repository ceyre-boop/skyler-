import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service — Fable",
  description: "Terms of Service for TABOOST-Post-Automation.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="July 26, 2026">
      <p>
        These Terms of Service (&ldquo;Terms&rdquo;) govern your use of
        TABOOST-Post-Automation (&ldquo;the Service&rdquo;, &ldquo;we&rdquo;,
        &ldquo;us&rdquo;). The Service lets you connect your own social media accounts
        (TikTok, Instagram, Facebook, and Discord) and publish a video you upload to your
        selected platforms as a story, video, or post. By using the Service, you agree to
        these Terms. If you do not agree, do not use the Service.
      </p>

      <section className="flex flex-col gap-3">
        <h2>1. Acceptable use</h2>
        <p>You agree to use the Service lawfully and responsibly. You will not:</p>
        <ul>
          <li>
            Publish content that is illegal, infringing, deceptive, or that violates the
            rules or terms of any connected platform (TikTok, Instagram, Facebook, or
            Discord).
          </li>
          <li>Upload content you do not have the rights to publish.</li>
          <li>
            Use the Service to send spam, malware, or to harass, threaten, or harm others.
          </li>
          <li>
            Attempt to disrupt, reverse engineer, overload, or gain unauthorized access to
            the Service or its systems.
          </li>
          <li>
            Use the Service to evade any platform&rsquo;s restrictions, rate limits, or
            enforcement actions.
          </li>
        </ul>
        <p>
          You are responsible for ensuring your content complies with the policies of every
          platform you publish to.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2>2. Account ownership and authorization</h2>
        <p>
          You may only connect social media accounts that you own or are explicitly
          authorized to manage. By connecting an account, you represent that you have the
          right to grant the Service permission to publish on its behalf. You authorize the
          Service to access only the accounts you connect and to publish only the content
          you upload and approve. You are responsible for all activity that occurs through
          the accounts you connect.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2>3. Content ownership</h2>
        <p>
          You retain all ownership of the content you create and upload. We do not claim
          ownership of your content. You grant us only the limited permission needed to
          store, process, and publish your content to the platforms and post types you
          select, for the purpose of providing the Service. Once content is published to a
          platform, that platform&rsquo;s terms govern its use on that platform.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2>4. Service availability</h2>
        <p>
          The Service depends on third-party platforms and infrastructure (including TikTok,
          Meta, Discord, Neon, Cloudinary, and Netlify). Those services may change,
          restrict, or interrupt access at any time, which can affect the Service. We may
          modify, suspend, or discontinue any part of the Service at any time without
          liability.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2>5. No warranty</h2>
        <p>
          The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;,
          without warranties of any kind, whether express or implied, including but not
          limited to warranties of merchantability, fitness for a particular purpose, and
          non-infringement. We do not warrant that the Service will be uninterrupted,
          error-free, secure, or that any post will be successfully delivered to any
          platform.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2>6. Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, TABOOST-Post-Automation and its operators
          will not be liable for any indirect, incidental, special, consequential, or
          punitive damages, or for any loss of profits, data, goodwill, or content, arising
          out of or related to your use of (or inability to use) the Service — including
          failed, delayed, or removed posts, or actions taken by any connected platform
          against your account. To the extent liability cannot be excluded, our total
          liability is limited to the amount you paid us, if any, for the Service in the
          three months preceding the claim.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2>7. Termination</h2>
        <p>
          You may stop using the Service at any time by disconnecting your accounts and
          deleting your account. We may suspend or terminate your access if you violate
          these Terms, misuse the Service, or if required by a platform or by law. On
          termination, your stored credentials and data are deleted as described in our{" "}
          <Link href="/privacy">Privacy Policy</Link>. Sections that by their nature should
          survive termination — including content ownership, no warranty, and limitation of
          liability — will continue to apply.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2>8. Changes to these Terms</h2>
        <p>
          We may update these Terms from time to time. When we do, we will revise the
          &ldquo;Last updated&rdquo; date above. Continued use of the Service after a change
          means you accept the updated Terms.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2>9. Contact</h2>
        <p>
          Questions about these Terms? Contact us at{" "}
          <a href="mailto:colineyre222@gmail.com">colineyre222@gmail.com</a>.
        </p>
      </section>
    </LegalPage>
  );
}
