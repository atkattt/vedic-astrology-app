import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Starfield } from "@/components/starfield"
import { AuthForm } from "@/components/auth-form"

export default async function SignUpPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) redirect("/circle")

  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-6 py-16">
      <Starfield count={70} />

      <div className="relative z-10 w-full max-w-sm">
        <Link
          href="/"
          className="mb-10 block text-center font-serif text-2xl font-light text-foreground"
        >
          Spiral <span className="italic text-primary">Inward</span>
        </Link>

        <h1 className="mb-1 text-center font-serif text-3xl font-light">
          Begin your chart
        </h1>
        <p className="mb-8 text-center font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Map the people you carry with you
        </p>

        <AuthForm mode="sign-up" />
      </div>
    </main>
  )
}
