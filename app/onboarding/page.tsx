"use client"

import { useRouter } from "next/navigation"
import TerminalOnboarding from "@/components/TerminalOnboarding"

export default function OnboardingPage() {
  const router = useRouter()

  return (
    <TerminalOnboarding
      onComplete={(data) => {
        // Birth-data ritual is done. Stash the answers so the account step
        // (next screen) can read them. The email/account decision lives
        // downstream, not inside the terminal — this is the intended hook.
        try {
          sessionStorage.setItem("spiral_birth_data", JSON.stringify(data))
        } catch {
          // sessionStorage may be unavailable (private mode); proceed anyway.
        }
        router.push("/sign-up")
      }}
    />
  )
}
