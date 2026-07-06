"use client"

import { useRouter } from "next/navigation"
import ThresholdScreen from "@/components/threshold/threshold-screen"

export default function ThresholdPage() {
  const router = useRouter()

  return (
    <ThresholdScreen
      onEnter={() => {
        // The chart has been read from the birth data; now create an account to
        // keep it. Sign-up reads the stashed chart after confirmation.
        router.push("/sign-up")
      }}
    />
  )
}
