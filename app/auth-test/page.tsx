"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

type State = {
  loading: boolean
  signedIn: boolean
  userId: string | null
  email: string | null
  profileExists: boolean | null
  error: string | null
}

export default function AuthTestPage() {
  const router = useRouter()
  const [state, setState] = useState<State>({
    loading: true,
    signedIn: false,
    userId: null,
    email: null,
    profileExists: null,
    error: null,
  })

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError && userError.name !== "AuthSessionMissingError") {
        setState((s) => ({ ...s, loading: false, error: userError.message }))
        return
      }

      if (!user) {
        setState({
          loading: false,
          signedIn: false,
          userId: null,
          email: null,
          profileExists: null,
          error: null,
        })
        return
      }

      // Does a profiles row exist for this user?
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle()

      setState({
        loading: false,
        signedIn: true,
        userId: user.id,
        email: user.email ?? null,
        profileExists: profileError ? null : !!profile,
        error: profileError ? profileError.message : null,
      })
    }

    load()
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    if (error) {
      setState((s) => ({ ...s, error: error.message }))
      return
    }
    router.refresh()
    router.push("/auth-test")
    // Reload state after sign-out.
    setState({
      loading: false,
      signedIn: false,
      userId: null,
      email: null,
      profileExists: null,
      error: null,
    })
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col gap-8 px-6 py-16 font-mono text-sm lowercase text-foreground">
      <header className="flex flex-col gap-2">
        <h1 className="text-base tracking-widest text-muted-foreground">
          auth test
        </h1>
        <p className="leading-relaxed text-muted-foreground">
          a temporary window into the supabase session.
        </p>
      </header>

      {state.loading ? (
        <p className="text-muted-foreground">checking session…</p>
      ) : (
        <section className="flex flex-col gap-5">
          <Row
            label="session status"
            value={state.signedIn ? "signed in" : "signed out"}
          />
          {state.signedIn && (
            <>
              <Row label="user id" value={state.userId ?? "—"} />
              <Row label="email" value={state.email ?? "—"} />
              <Row
                label="profiles row"
                value={
                  state.profileExists === null
                    ? "unknown"
                    : state.profileExists
                      ? "exists"
                      : "missing"
                }
              />
            </>
          )}

          {state.error && (
            <p className="leading-relaxed text-red-400" role="alert">
              {state.error}
            </p>
          )}

          {state.signedIn && (
            <button
              onClick={handleSignOut}
              className="mt-2 self-start rounded-full border border-border px-6 py-2 uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
            >
              sign out
            </button>
          )}
        </section>
      )}
    </main>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-l border-border/60 pl-4">
      <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span className="break-all text-foreground">{value}</span>
    </div>
  )
}
