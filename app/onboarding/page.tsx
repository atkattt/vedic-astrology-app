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
        // The birth-data ritual is done. Hand off to the threshold screen,
        // where the chart "reads" (loads) while the visitor can read the
        // project's story. From there, "enter the spiral" continues to /circle.
        router.push("/threshold")
      }}
    />
  )
}
