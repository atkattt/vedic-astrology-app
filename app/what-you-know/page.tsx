import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { SelfView } from "@/components/spiral/self-view"

// "send to your self" is available always — no locked state on this page,
// ever — so the view needs no gate from the server.
export default async function WhatYouKnowPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    const cookieStore = await cookies()
    if (cookieStore.get("spiral_guest")?.value !== "1") redirect("/sign-in")
  }

  return <SelfView />
}
