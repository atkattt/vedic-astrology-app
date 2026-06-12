import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getPeople, getRelationships } from '@/app/actions/circle'
import { ConstellationView } from '@/components/constellation/constellation-view'

export default async function CirclePage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const [people, relationships] = await Promise.all([
    getPeople(),
    getRelationships(),
  ])

  return (
    <ConstellationView
      people={people}
      relationships={relationships}
      userName={session.user.name}
    />
  )
}
