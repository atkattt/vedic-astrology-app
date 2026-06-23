"use client"

import { useRouter } from "next/navigation"
import TerminalOnboarding from "@/components/TerminalOnboarding"

export default function OnboardingPage() {
  const router = useRouter()

  return (
    <TerminalOnboarding
      onComplete={(data) => {
        // Birth-data ritual is done. Stash the answers so the account step can
        // read them once we wire it back up later in the flow.
        try {
          sessionStorage.setItem("spiral_birth_data", JSON.stringify(data))
        } catch {
          // sessionStorage may be unavailable (private mode); proceed anyway.
        }
        // For now, skip the account step and drop the visitor straight into the
        // spiral homepage (self avatar + constellation). The /guest route sets
        // the lightweight guest cookie and redirects to /circle. The make-an-
        // account portion will slot back in here once the core flow is final.
        router.push("/guest")
      }}
    />
  )
}
