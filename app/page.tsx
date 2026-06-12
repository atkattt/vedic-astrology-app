import Link from 'next/link'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { Starfield } from '@/components/starfield'
import { Button } from '@/components/ui/button'

export default async function WelcomePage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) redirect('/circle')

  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-6 text-center">
      <Starfield count={120} />

      {/* Soft radial glow behind the title */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[60vh] w-[60vh] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle, var(--primary) 0%, transparent 70%)',
          opacity: 0.12,
        }}
      />

      <div className="relative flex flex-col items-center gap-8">
        <p className="font-mono text-xs uppercase tracking-[0.4em] text-primary">
          A constellation of kin
        </p>

        <h1 className="text-pretty font-serif text-5xl font-light italic leading-tight text-foreground sm:text-6xl">
          Spiral
          <br />
          Inward
        </h1>

        <p className="max-w-xs text-pretty font-sans text-base leading-relaxed text-muted-foreground">
          Map the people who shape you — their stars, their bonds, the quiet
          geometry of your life.
        </p>

        <Button
          asChild
          size="lg"
          className="mt-2 rounded-full px-10 font-mono text-xs uppercase tracking-[0.2em]"
        >
          <Link href="/sign-up">Begin</Link>
        </Button>

        <Link
          href="/sign-in"
          className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground underline-offset-8 transition-colors hover:text-foreground hover:underline"
        >
          I have an account
        </Link>
      </div>
    </main>
  )
}
