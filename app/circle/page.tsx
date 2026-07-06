import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getPeople, getRelationships } from "@/app/actions/circle"
import { getRevealRadius } from "@/app/actions/progress"
import { loadEngagementScore } from "@/lib/self/reads-data"
import { CircleView } from "@/components/circle/circle-view"
import { CircleDataProvider } from "@/components/circle/circle-data-provider"
import { BirthChartBootstrap } from "@/components/birth-chart-bootstrap"
import { DEMO_PEOPLE, DEMO_RELATIONSHIPS } from "@/lib/circle/demo"

// Starting frontier for fresh / guest universes (mirrors BASE_REVEAL_RADIUS).
const BASE_REVEAL_RADIUS = 240

export default async function CirclePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const [people, relationships, revealRadius, engagementScore] =
      await Promise.all([
        getPeople(),
        getRelationships(),
        getRevealRadius(),
        loadEngagementScore(supabase, user.id),
      ])

    const userName =
      (user.user_metadata?.name as string | undefined) ||
      user.email?.split("@")[0] ||
      "You"

    return (
      <CircleDataProvider
        guest={false}
        initialPeople={people}
        initialRelationships={relationships}
      >
        <BirthChartBootstrap />
        <CircleView
          userName={userName}
          initialRevealRadius={revealRadius}
          engagementScore={engagementScore}
          userId={user.id}
        />
      </CircleDataProvider>
    )
  }

  // No account: allow a guest walkthrough if they entered via "Look around".
  const cookieStore = await cookies()
  if (cookieStore.get("spiral_guest")?.value === "1") {
    return (
      <CircleDataProvider
        guest
        initialPeople={DEMO_PEOPLE}
        initialRelationships={DEMO_RELATIONSHIPS}
      >
        <CircleView
          userName="Wanderer"
          initialRevealRadius={BASE_REVEAL_RADIUS}
        />
      </CircleDataProvider>
    )
  }

  redirect("/sign-in")
}
