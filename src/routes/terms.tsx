import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/terms')({
  component: TermsPage,
})

function TermsPage() {
  return (
    <main className="mx-auto min-h-svh max-w-3xl px-6 py-16 sm:py-24">
      <Link to="/" className="text-sm font-semibold">
        Bountiz
      </Link>
      <article className="mt-12 space-y-8">
        <header>
          <h1 className="text-4xl font-semibold tracking-tight">
            Terms of Service
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Last updated: August 21, 2026
          </p>
        </header>
        <div className="space-y-6 text-base leading-7 text-muted-foreground">
          <p>
            These terms govern your use of Bountiz, a service for managing
            creator campaigns. By using Bountiz, you agree to these terms.
          </p>
          <Section title="Using Bountiz">
            <p>
              You must provide accurate account information, protect your login
              credentials, and use the service only for lawful purposes. You are
              responsible for activity performed through your account.
            </p>
          </Section>
          <Section title="Connected services">
            <p>
              Bountiz may connect to third-party services such as YouTube,
              TikTok, and Instagram at your direction. Those services are
              governed by their own terms. You authorize us to access and
              process the data needed to provide the features you request until
              you disconnect them.
            </p>
          </Section>
          <Section title="Your content">
            <p>
              You retain ownership of your content and data. You grant us the
              limited permission needed to host, process, and display it solely
              to operate and improve Bountiz.
            </p>
          </Section>
          <Section title="Availability and changes">
            <p>
              The service is provided on an “as is” and “as available” basis. We
              may modify or discontinue features and may suspend accounts that
              violate these terms or create risk for the service or its users.
            </p>
          </Section>
          <Section title="Liability">
            <p>
              To the extent permitted by law, Bountiz is not liable for
              indirect, incidental, special, consequential, or lost-profit
              damages arising from your use of the service.
            </p>
          </Section>
          <Section title="Contact">
            <p>Questions about these terms can be sent to legal@bountiz.xyz.</p>
          </Section>
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
