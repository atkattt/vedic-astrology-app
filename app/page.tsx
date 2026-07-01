import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Eye } from "lucide-react"
import SwirlCloudSky from "@/components/SwirlCloudSky"
import AsciiRippleSky from "@/components/AsciiRippleSky"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default async function WelcomePage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) redirect("/circle")

  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-6 py-16">
      {/* Sky field: clouds (z-0) behind the ASCII ripple (z-1), one shared wave */}
      <SwirlCloudSky />
      <AsciiRippleSky />

      <div className="relative z-10 flex flex-col items-center text-center">
        <h1
          className="animate-fade-in-up text-balance text-foreground"
          style={{
            fontFamily: '"JetBrains Mono", sans-serif',
            fontWeight: '700',
            textTransform: 'lowercase',
            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
            letterSpacing: '-0.03em',
            lineHeight: '0.9em',
            fontSize: '39px',
            paddingBottom: '0',
            marginBottom: '-30px',
            animationDelay: "0.1s"
          }}
        >
          spiral
          <br />
          <span className="text-primary">inward</span>
        </h1>

        <div
          className="animate-fade-in-up mt-10 flex flex-col items-center gap-4"
          style={{ animationDelay: "0.2s" }}
        >
          <Link
            href="/onboarding"
            className={cn(
              buttonVariants({ size: "lg" }),
              "h-11 rounded-full px-10 font-mono text-sm uppercase tracking-widest",
            )}
          >
            Begin
          </Link>
          <Button
            render={<Link href="/guest" />}
            nativeButton={false}
            variant="ghost"
            size="sm"
            className="text-muted-foreground/70 transition-colors hover:text-foreground"
            style={{ paddingBottom: "25px" }}
          >
            <Eye className="size-5" />
          </Button>
        </div>
      </div>
    </main>
  )
}
