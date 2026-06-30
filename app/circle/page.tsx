import { auth } from "@/lib/auth"
import { headers, cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getPeople, getRelationships } from "@/app/actions/circle"
import { getRevealRadius } from "@/app/actions/progress"
import { CircleView } from "@/components/circle/circle-view"
import { CircleDataProvider } from "@/components/circle/circle-data-provider"
import { DEMO_PEOPLE, DEMO_RELATIONSHIPS } from "@/lib/circle/demo"

// Starting frontier for fresh / guest universes (mirrors BASE_REVEAL_RADIUS).
const BASE_REVEAL_RADIUS = 240

export default async function CirclePage() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (session?.user) {
    const [people, relationships, revealRadius] = await Promise.all([
      getPeople(),
      getRelationships(),
      getRevealRadius(),
    ])

    return (
      <CircleDataProvider
        guest={false}
        initialPeople={people}
        initialRelationships={relationships}
      >
        <CircleView
          userName={session.user.name}
          initialRevealRadius={revealRadius}
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
