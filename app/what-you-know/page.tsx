import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { SelfView } from "@/components/spiral/self-view"
import { getRevealRadius } from "@/app/actions/progress"
import { CHAT_UNLOCK_RADIUS } from "@/lib/self/unlock"

export default async function WhatYouKnowPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    const cookieStore = await cookies()
    if (cookieStore.get("spiral_guest")?.value !== "1") redirect("/sign-in")
    // Guests: the self chat is always still locked.
    return <SelfView chatUnlocked={false} />
  }

  // Whether "talk about this" can open the conversation — same gate as /self.
  const revealRadius = await getRevealRadius()
  return <SelfView chatUnlocked={revealRadius >= CHAT_UNLOCK_RADIUS} />
}
