import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { getPeople, getRelationships } from "@/app/actions/circle"
import { CircleView } from "@/components/circle/circle-view"

export default async function CirclePage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/sign-in")

  const [people, relationships] = await Promise.all([
    getPeople(),
    getRelationships(),
  ])

  return (
    <CircleView
      people={people}
      relationships={relationships}
      userName={session.user.name}
    />
  )
}
