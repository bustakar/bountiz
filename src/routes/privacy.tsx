import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/privacy')({
  component: PrivacyPage,
})

function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="August 21, 2026">
      <p>
        Bountiz (“we”) provides tools for managing creator campaigns. This
        policy explains how we handle information when you use Bountiz.
      </p>
      <Section title="Information we collect">
        <p>
          We collect account information you provide, such as your name and
          email address. When you connect a third-party service such as YouTube,
          TikTok, or Instagram, we receive the account identity, profile
          details, and data you authorize that service to share. We also collect
          basic technical information needed to operate and secure the service.
        </p>
      </Section>
      <Section title="How we use information">
        <p>
          We use information to provide and secure Bountiz, display connected
          accounts, support campaign features, troubleshoot problems, and comply
          with legal obligations. We do not sell personal information.
        </p>
      </Section>
      <Section title="Sharing and storage">
        <p>
          We share information only with service providers needed to operate
          Bountiz, when you direct us to, or when required by law. Information
          may be processed where our providers operate and is retained only as
          long as needed for the purposes above.
        </p>
      </Section>
      <Section title="Connected services">
        <p>
          Your use of connected services remains subject to their own terms and
          privacy policies. You can disconnect an account from Bountiz at any
          time. We then remove the local connection and attempt to revoke the
          provider token where supported.
        </p>
      </Section>
      <Section title="Your choices">
        <p>
          You may request access, correction, or deletion of your personal
          information, subject to applicable law. Contact us with privacy
          questions at privacy@bountiz.xyz.
        </p>
      </Section>
    </LegalPage>
  )
}

function LegalPage({
  title,
  updated,
  children,
}: {
  title: string
  updated: string
  children: React.ReactNode
}) {
  return (
    <main className="mx-auto min-h-svh max-w-3xl px-6 py-16 sm:py-24">
      <Link to="/" className="text-sm font-semibold">
        Bountiz
      </Link>
      <article className="mt-12 space-y-8">
        <header>
          <h1 className="text-4xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Last updated: {updated}
          </p>
        </header>
        <div className="space-y-6 text-base leading-7 text-muted-foreground">
          {children}
        </div>
      </article>
    </main>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  )
}
