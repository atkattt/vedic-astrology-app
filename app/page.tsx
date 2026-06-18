import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Starfield } from "@/components/starfield"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default async function WelcomePage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) redirect("/circle")

  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-6 py-16">
      <Starfield count={110} />

      <div className="relative z-10 flex flex-col items-center text-center">
        <h1
          className="animate-fade-in-up text-balance text-5xl font-light text-foreground sm:text-6xl"
          style={{ fontFamily: '"Lato", sans-serif', lineHeight: '1', animationDelay: "0.1s" }}
        >
          Spiral
          <br />
          <span className="italic text-primary">Inward</span>
        </h1>

        <p
          className="animate-fade-in-up mt-6 max-w-xs text-pretty text-base text-muted-foreground"
          style={{ fontFamily: '"Lato", sans-serif', lineHeight: '1', animationDelay: "0.2s" }}
        >
          Map the people in your life among the stars, and trace the bonds that
          hold them close.
        </p>

        <div
          className="animate-fade-in-up mt-10 flex flex-col items-center gap-4"
          style={{ animationDelay: "0.3s" }}
        >
          <Link
            href="/sign-up"
            className={cn(
              buttonVariants({ size: "lg" }),
              "h-11 rounded-full px-10 font-mono text-sm uppercase tracking-widest",
            )}
          >
            Begin
          </Link>
          <Link
            href="/sign-in"
            className="font-mono text-xs uppercase tracking-widest text-muted-foreground underline-offset-4 transition-colors hover:text-foreground"
          >
            I already have a chart
          </Link>
          <Button
            render={<Link href="/guest" />}
            variant="ghost"
            size="sm"
            className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70 transition-colors hover:text-foreground"
          >
            Just look around
          </Button>
        </div>
      </div>
    </main>
  )
}
