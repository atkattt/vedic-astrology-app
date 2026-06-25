"use client"

import { useRouter } from "next/navigation"
import ThresholdScreen from "@/components/threshold/threshold-screen"

export default function ThresholdPage() {
  const router = useRouter()

  return (
    <ThresholdScreen
      onEnter={() => {
        // /guest sets the lightweight guest cookie and redirects to /circle,
        // the spiral homepage with the self avatar.
        router.push("/guest")
      }}
    />
  )
}
