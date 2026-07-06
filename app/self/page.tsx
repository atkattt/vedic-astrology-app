import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Starfield } from "@/components/starfield"

export const metadata = {
  title: "Self · Spiral Inward",
  description: "Your self, being built.",
}

export default async function SelfPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    const cookieStore = await cookies()
    if (cookieStore.get("spiral_guest")?.value !== "1") redirect("/sign-in")
  }

  return (
    <main className="relative flex min-h-[100dvh] flex-col bg-background">
      <Starfield count={70} />

      <header className="relative z-20 flex items-center px-5 pt-6">
        <Link
          href="/circle"
          className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          back
        </Link>
      </header>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-7 pb-24 text-center">
        <p className="font-serif text-lg font-light lowercase text-foreground">
          your self is being built
        </p>
      </div>
    </main>
  )
}
