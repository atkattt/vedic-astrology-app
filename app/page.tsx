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
      {/* Extremely light grid: sits at the very back (z-0) behind the sky
          layers, giving a faint blueprint texture to the void. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Sky field: clouds (z-0) behind the ASCII ripple (z-1), one shared wave */}
      <SwirlCloudSky />
      <AsciiRippleSky />

      <div className="relative z-10 flex flex-col items-center text-center">
        <div
          className="animate-fade-in-up mt-10 flex flex-col items-center gap-4"
          style={{ animationDelay: "0.2s" }}
        >
          <Link
            href="/onboarding"
            className={cn(
              buttonVariants({ size: "lg" }),
              "h-11 rounded-[22px] px-[25px] pr-[21px] text-xs font-semibold uppercase tracking-[0.108em]",
            )}
            style={{
              color: "#2a2a2a",
              fontFamily: '"Geist Pixel", sans-serif',
              fontSize: "10px",
              lineHeight: "0.8em",
            }}
          >
            begin
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
