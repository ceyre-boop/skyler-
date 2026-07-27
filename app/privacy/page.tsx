import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy — Fable",
  description: "Privacy Policy for TABOOST-Post-Automation.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="July 26, 2026">
      <p>
        TABOOST-Post-Automation (&ldquo;the Service&rdquo;, &ldquo;we&rdquo;,
        &ldquo;us&rdquo;) lets creators connect their own social media accounts and publish
        a single video to several platforms at once. This Privacy Policy explains what data
        we collect, how we store and use it, who we share it with, and the choices you have
        over your data. By using the Service, you agree to the practices described here.
      </p>

      <section className="flex flex-col gap-3">
        <h2>1. What data we collect</h2>
        <p>We collect only the data needed to operate the Service:</p>
        <ul>
          <li>
            <strong>Account email.</strong> The email address you use to sign in to
            TABOOST-Post-Automation.
          </li>
          <li>
            <strong>OAuth access and refresh tokens.</strong> When you connect a platform
            (TikTok, Instagram, Facebook, or Discord), that platform issues us a token after
            you log in on the platform&rsquo;s own page and approve access. We store these
            tokens to publish on your behalf.
          </li>
          <li>
            <strong>Account identifiers.</strong> Public identifiers for the accounts you
            connect — such as your platform user ID, username, and display name — so we can
            show you which accounts are linked and route your post to the right destination.
          </li>
          <li>
            <strong>Uploaded media.</strong> The video files and any accompanying captions
            or metadata you upload to publish.
          </li>
          <li>
            <strong>Basic operational data.</strong> Records of publishing actions (for
            example, which platforms a post was sent to and whether it succeeded) so we can
            show status and diagnose errors.
          </li>
        </ul>
        <p>
          <strong>We never see or store your platform passwords.</strong> Authentication
          happens entirely on each platform&rsquo;s own login page through OAuth. We only
          receive the tokens that you authorize, and only for the accounts you explicitly
          connect.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2>2. How your data is stored</h2>
        <p>
          Your account data, connection records, and OAuth tokens are stored in a Neon
          Postgres database. Uploaded media is stored with Cloudinary. Our application runs
          on Netlify and communicates with Neon, Cloudinary, and the platform APIs over
          encrypted (HTTPS/TLS) connections. Session cookies are encrypted, and access to
          the database is restricted to the application.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2>3. How we use your data</h2>
        <p>We use your data solely to provide the Service:</p>
        <ul>
          <li>To authenticate you and keep you signed in.</li>
          <li>
            To publish the content you upload to the platforms and post types (story, video,
            or post) you select.
          </li>
          <li>
            To refresh your platform connections so publishing keeps working without you
            having to reconnect each time.
          </li>
          <li>To show you the status of your posts and help resolve errors.</li>
        </ul>
        <p>
          We only access accounts you explicitly connect, and we only publish content that
          you upload and approve. We do not read your private messages, we do not post
          without your action, and we do not sell your data or use it for advertising.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2>4. Third parties we share data with</h2>
        <p>
          We share data only with the service providers required to operate the Service, and
          only as needed to perform the action you requested:
        </p>
        <ul>
          <li>
            <strong>TikTok API</strong> — to publish to TikTok accounts you connect.
          </li>
          <li>
            <strong>Meta (Facebook and Instagram) APIs</strong> — to publish to Facebook and
            Instagram accounts you connect.
          </li>
          <li>
            <strong>Discord API</strong> — to publish to Discord destinations you connect.
          </li>
          <li>
            <strong>Neon</strong> — Postgres database hosting for your account data, tokens,
            and connection details.
          </li>
          <li>
            <strong>Cloudinary</strong> — media storage and delivery for the videos you
            upload.
          </li>
          <li>
            <strong>Netlify</strong> — hosting for our application.
          </li>
        </ul>
        <p>
          Each platform&rsquo;s handling of content you publish is governed by that
          platform&rsquo;s own terms and privacy policy. We do not share your data with any
          other third parties for marketing or profiling.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2>5. Data retention</h2>
        <p>
          We retain your account data, OAuth tokens, and connection details for as long as
          your account is active so the Service can keep functioning. Uploaded media is
          retained as needed to complete publishing and to show you the status of your
          posts; it may be removed after publishing is complete. When you disconnect a
          platform or delete your account, we delete the associated tokens and account data
          as described below. We may retain minimal records where required to comply with
          legal obligations.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2>6. Revoking access and deleting your data</h2>
        <p>You are in control of your connections and your data at all times:</p>
        <ul>
          <li>
            <strong>Disconnect a platform.</strong> Removing a connected account in
            TABOOST-Post-Automation deletes the stored OAuth tokens for that platform. You
            can also revoke our access directly from the platform&rsquo;s own settings (for
            example, the &ldquo;Apps and Websites&rdquo; or &ldquo;Connected Apps&rdquo; /
            &ldquo;Authorized Apps&rdquo; section of TikTok, Facebook, Instagram, or
            Discord).
          </li>
          <li>
            <strong>Delete your data and account.</strong> To delete your account and all
            associated data — including your email, OAuth tokens, account identifiers, and
            uploaded media — email us at the address below and we will process your request.
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2>7. Security</h2>
        <p>
          We protect your data with encryption in transit (HTTPS/TLS) and encrypted session
          cookies, and we limit access to stored credentials to the application itself. No
          method of storage or transmission is perfectly secure, but we work to safeguard
          your information and limit access to it.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2>8. Children</h2>
        <p>
          The Service is not directed to children, and you must meet the minimum age
          required by each platform you connect. We do not knowingly collect data from
          anyone who does not meet those age requirements.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2>9. Changes to this policy</h2>
        <p>
          We may update this Privacy Policy from time to time. When we do, we will revise
          the &ldquo;Last updated&rdquo; date above. Continued use of the Service after a
          change means you accept the updated policy.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2>10. Contact</h2>
        <p>
          For privacy questions or data deletion requests, contact us at{" "}
          <a href="mailto:colineyre222@gmail.com">colineyre222@gmail.com</a>. See also our{" "}
          <Link href="/terms">Terms of Service</Link>.
        </p>
      </section>
    </LegalPage>
  );
}
