import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getRevealRadius } from "@/app/actions/progress"
import { SelfSpaceView } from "@/components/self/self-space-view"
import { BASE_REVEAL_RADIUS } from "@/lib/self/unlock"

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
    // Guests can see the shape of the page, but the conversation stays locked.
    return <SelfSpaceView revealRadius={BASE_REVEAL_RADIUS} />
  }

  const revealRadius = await getRevealRadius()
  return <SelfSpaceView revealRadius={revealRadius} />
}
