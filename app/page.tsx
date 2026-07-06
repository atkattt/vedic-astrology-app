import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Eye } from "lucide-react"
import SwirlCloudSky from "@/components/SwirlCloudSky"
import AsciiRippleSky from "@/components/AsciiRippleSky"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default async function WelcomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) redirect("/circle")

  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-6 py-16">
      {/* Sky field: clouds (z-0) behind the ASCII ripple (z-1), one shared wave */}
      <SwirlCloudSky />
      <AsciiRippleSky />

      <div className="relative z-10 flex flex-col items-center text-center">
        <h1
          className="animate-fade-in-up text-balance"
          style={{
            fontFamily: '"JetBrains Mono", sans-serif',
            fontWeight: '700',
            textTransform: 'lowercase',
            letterSpacing: '-0.03em',
            lineHeight: '0.9em',
            fontSize: '39px',
            paddingBottom: '0',
            marginBottom: '-30px',
            animationDelay: "0.1s",
            color: '#f5f5f5'
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
            style={{ color: "#2a2a2a" }}
          >
            Begin
          </Link>
          <Button
            render={<Link href="/guest" />}
            nativeButton={false}
            variant="ghost"
            size="sm"
            className="text-foreground transition-colors hover:text-foreground"
            style={{ paddingBottom: "25px" }}
          >
            <Eye className="size-5 text-white" />
          </Button>
        </div>
      </div>
    </main>
  )
}
