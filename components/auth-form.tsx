"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { authClient } from "@/lib/auth-client"
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

  const isSignUp = mode === "sign-up"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (isSignUp) {
        const { error } = await authClient.signUp.email({
          email,
          password,
          name: name.trim() || email.split("@")[0],
        })
        if (error) throw new Error(error.message || "Could not create account")
      } else {
        const { error } = await authClient.signIn.email({ email, password })
        if (error) throw new Error(error.message || "Could not sign in")
      }
      router.push("/circle")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      setLoading(false)
    }
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
