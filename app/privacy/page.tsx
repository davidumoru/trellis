import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";

export const metadata: Metadata = {
  title: "Privacy Policy - Trellis",
  description:
    "How Trellis collects, uses, stores, and protects your data — including Gmail and Google Calendar data accessed under Google API scopes.",
};

const LAST_UPDATED = "May 29, 2026";
const CONTACT_EMAIL = "trellis@davidumoru.me";

export default function PrivacyPage() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-8 pt-16 pb-24">
        <div className="mb-12">
          <h1 className="font-heading text-4xl font-medium leading-[1.1] tracking-[-0.02em] sm:text-5xl">
            Privacy Policy
          </h1>
          <p className="mt-4 text-sm text-muted-foreground">
            Last updated {LAST_UPDATED}
          </p>
        </div>

        <Prose>
          <p>
            Trellis (“we”, “us”) is a personal job-search assistant built for
            the 2026 Google Cloud Rapid Agent Hackathon. This policy explains what
            information we collect, how we use it, who we share it with, and the
            rights you have over it. By using Trellis you agree to the practices
            described below.
          </p>

          <H2 id="information-we-collect">1. Information we collect</H2>
          <p>
            <strong>Account information.</strong> When you sign up we collect
            your email address. If you sign in with Google we additionally
            receive your name, profile picture URL, and Google account ID, as
            authorized by you through Google’s standard OAuth consent screen.
          </p>
          <p>
            <strong>Google user data (Gmail).</strong> If you choose to connect
            Gmail, Trellis requests the{" "}
            <code>https://www.googleapis.com/auth/gmail.readonly</code> scope.
            We read message metadata (sender, subject, date, thread ID) and
            message bodies in order to detect recruiter outreach, build the
            conversations side of your pipeline, and surface stale threads. We
            do not send, modify, or delete any of your messages.
          </p>
          <p>
            <strong>Google user data (Calendar).</strong> If you choose to
            connect Google Calendar, Trellis requests the{" "}
            <code>https://www.googleapis.com/auth/calendar.readonly</code>{" "}
            scope. We read event titles, times, and attendee lists to correlate
            interviews and meetings with applications in your pipeline. We do
            not create, modify, or delete events.
          </p>
          <p>
            <strong>User-generated content.</strong> Applications you add or
            paste, notes you write, resumes and cover letters you generate, and
            questions you ask the agent.
          </p>
          <p>
            <strong>Operational data.</strong> Authentication sessions, error
            logs, and minimal request metadata required to operate the service
            (e.g., timestamps, IP address for rate limiting and abuse
            prevention).
          </p>

          <H2 id="how-we-use-information">2. How we use information</H2>
          <ul>
            <li>
              To operate the three loops of the product: intake (tailoring
              resumes from job descriptions), memory (answering questions about
              your pipeline), and maintenance (surfacing stale threads and
              follow-ups).
            </li>
            <li>
              To generate vector embeddings of your applications, conversations,
              and documents so we can perform semantic search across your own
              data.
            </li>
            <li>To authenticate you and keep your session active.</li>
            <li>To diagnose errors and improve reliability.</li>
          </ul>
          <p>
            We do not use your data for advertising. We do not sell your data.
            We do not use your Gmail or Calendar contents to train, fine-tune,
            or improve any generalized AI or machine-learning model.
          </p>

          <H2 id="limited-use-disclosure">
            3. Google API Services User Data Policy
          </H2>
          <p>
            Trellis’s use and transfer of information received from Google APIs
            to any other app will adhere to the{" "}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements.
          </p>
          <p>Specifically:</p>
          <ul>
            <li>
              We only use Google user data to provide or improve user-facing
              features that are prominent in the Trellis user interface.
            </li>
            <li>
              We do not transfer Google user data to others except as necessary
              to provide or improve user-facing features (e.g., the LLM
              providers listed below), to comply with applicable law, or as part
              of a merger, acquisition, or sale of assets with notice to you.
            </li>
            <li>We do not use Google user data for serving advertisements.</li>
            <li>
              We do not allow humans to read Google user data unless we have
              your affirmative agreement for specific messages, we are doing so
              for security purposes (such as investigating abuse), to comply
              with applicable law, or for internal operations where the data has
              been aggregated and anonymized.
            </li>
          </ul>

          <H2 id="sharing">4. How we share data</H2>
          <p>
            <strong>LLM and embedding providers.</strong> To generate answers
            and embeddings we send the relevant portion of your prompt and
            retrieved context to large-language-model providers, currently{" "}
            <strong>Google (Gemini via Vertex AI)</strong>, routed through the{" "}
            <strong>Vercel AI Gateway</strong>. These providers process the data
            on our behalf under their respective data processing terms and do
            not retain content for training when accessed via these paid APIs.
          </p>
          <p>
            <strong>Database provider.</strong> Your data is stored in{" "}
            <strong>MongoDB Atlas</strong>, including the vector embeddings used
            for retrieval.
          </p>
          <p>
            <strong>Email and OAuth providers.</strong> Authentication is
            handled by better-auth, which sends OTP emails through our email
            provider and exchanges tokens with Google for OAuth sign-in and
            Gmail/Calendar access.
          </p>
          <p>
            We do not share your data with advertisers, data brokers, or any
            third party for marketing purposes.
          </p>

          <H2 id="storage-and-security">5. Storage and security</H2>
          <p>
            Data is stored in MongoDB Atlas in encrypted form at rest. All
            traffic between your browser and Trellis is encrypted in transit via
            TLS. OAuth refresh tokens are stored encrypted and used only to
            re-authenticate against Google APIs on your behalf.
          </p>
          <p>
            No system is perfectly secure. Trellis is a hackathon-stage project
            and we recommend you do not connect accounts containing data you
            would consider catastrophic to lose or expose.
          </p>

          <H2 id="retention">6. Data retention</H2>
          <p>
            We retain your data for as long as your account is active. When you
            delete your account, all associated data — including indexed Gmail
            and Calendar content, embeddings, applications, conversations, and
            artifacts — is deleted within 30 days, except for the minimum
            metadata required to comply with legal obligations or resolve
            disputes.
          </p>

          <H2 id="your-rights">7. Your rights</H2>
          <ul>
            <li>
              <strong>Access and export.</strong> You can request a copy of the
              data we hold about you by emailing {CONTACT_EMAIL}.
            </li>
            <li>
              <strong>Deletion.</strong> You can delete your account at any time
              from the dashboard settings, or by emailing {CONTACT_EMAIL}.
            </li>
            <li>
              <strong>Disconnect Google.</strong> You can revoke Gmail and
              Calendar access at any time from your{" "}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google Account permissions page
              </a>
              . Doing so will stop new data ingestion immediately; existing
              indexed data will remain until you delete your account.
            </li>
          </ul>

          <H2 id="children">8. Children</H2>
          <p>
            Trellis is not directed at children under 16 and we do not knowingly
            collect data from them. If you believe a child has provided us data,
            contact us and we will delete it.
          </p>

          <H2 id="changes">9. Changes to this policy</H2>
          <p>
            We may update this policy as the product evolves. Material changes
            will be communicated by updating the “Last updated” date above and,
            for users with an active account, by email.
          </p>

          <H2 id="contact">10. Contact</H2>
          <p>
            Questions, requests, or complaints can be sent to{" "}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </p>
        </Prose>
      </main>
      <SiteFooter />
    </div>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="
        flex flex-col gap-4 text-sm leading-relaxed text-muted-foreground
        [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-foreground/80
        [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[12px] [&_code]:text-foreground
        [&_strong]:font-medium [&_strong]:text-foreground
        [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-6
        [&_p]:mt-0
      "
    >
      {children}
    </div>
  );
}

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="font-heading mt-10 scroll-mt-24 text-xl font-medium tracking-tight text-foreground"
    >
      {children}
    </h2>
  );
}
