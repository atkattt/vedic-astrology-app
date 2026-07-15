"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const isSignUp = mode === "sign-up"

  async function handleGoogle() {
    setError(null)
    setGoogleLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/circle`,
      },
    })
    if (error) {
      setError(error.message || "Could not continue with Google")
      setGoogleLoading(false)
    }
    // On success the browser navigates away to Google — no further state.
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name: name.trim() || email.split("@")[0] },
            emailRedirectTo: `${window.location.origin}/auth/confirm`,
          },
        })
        if (error) throw new Error(error.message || "Could not create account")
        // Email confirmation is on: no session yet. If the email already
        // exists Supabase returns an obfuscated user with no identities.
        if (data.user && data.user.identities?.length === 0) {
          throw new Error("An account with this email already exists")
        }
        setEmailSent(true)
        setLoading(false)
        return
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw new Error(error.message || "Could not sign in")
      router.push("/circle")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      setLoading(false)
    }
  }

  // After a successful sign-up we wait on email confirmation.
  if (emailSent) {
    return (
      <div className="flex w-full flex-col gap-4 text-center">
        <p className="font-serif text-lg font-light text-foreground">
          check your email
        </p>
        <p className="font-mono text-xs leading-relaxed text-muted-foreground">
          we sent a confirmation link to{" "}
          <span className="text-foreground">{email}</span>. open it to finish
          mapping your chart, then sign in.
        </p>
        <Link
          href="/sign-in"
          className="mt-2 font-mono text-xs uppercase tracking-widest text-foreground underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-5">
      {isSignUp && (
        <div className="flex flex-col gap-2">
          <Label
            htmlFor="name"
            className="font-mono text-xs uppercase tracking-widest text-muted-foreground"
          >
            Your name
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Maya"
            autoComplete="name"
            className="h-12 bg-input/40"
          />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label
          htmlFor="email"
          className="font-mono text-xs uppercase tracking-widest text-muted-foreground"
        >
          Email
        </Label>
        <Input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          className="h-12 bg-input/40"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label
          htmlFor="password"
          className="font-mono text-xs uppercase tracking-widest text-muted-foreground"
        >
          Password
        </Label>
        <Input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          autoComplete={isSignUp ? "new-password" : "current-password"}
          className="h-12 bg-input/40"
        />
      </div>

      {error && (
        <p className="font-mono text-xs text-destructive" role="alert">
          {error}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={loading}
        className="mt-2 h-12 rounded-full font-mono text-sm uppercase tracking-widest"
      >
        {loading
          ? "One moment…"
          : isSignUp
            ? "Create your chart"
            : "Enter"}
      </Button>

      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        <span className="font-mono text-xs lowercase tracking-widest text-muted-foreground">
          or
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <Button
        type="button"
        variant="outline"
        size="lg"
        disabled={googleLoading || loading}
        onClick={handleGoogle}
        className="h-12 rounded-full font-mono text-xs lowercase tracking-widest bg-transparent"
      >
        {googleLoading ? "one moment…" : "continue with google"}
      </Button>

      <p className="text-center font-mono text-xs text-muted-foreground">
        {isSignUp ? (
          <>
            Already mapped?{" "}
            <Link
              href="/sign-in"
              className="text-foreground underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link
              href="/sign-up"
              className="text-foreground underline-offset-4 hover:underline"
            >
              Begin your chart
            </Link>
          </>
        )}
      </p>
    </form>
  )
}
