import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <main className="grid min-h-screen place-items-center bg-neutral-950 px-6 text-neutral-50">
      <section className="max-w-xl">
        <p className="mb-5 text-sm font-medium tracking-[0.18em] text-lime-300 uppercase">
          Bountiz
        </p>
        <h1 className="text-5xl leading-tight font-semibold tracking-tight sm:text-7xl">
          Posts that pay.
        </h1>
        <p className="mt-6 max-w-lg text-lg leading-8 text-neutral-400">
          Agent-first creator campaigns with payouts based on verified reach.
        </p>
      </section>
    </main>
  )
}
