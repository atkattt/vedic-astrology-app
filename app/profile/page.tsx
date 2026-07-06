import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ProfileView } from "@/components/profile/profile-view"

export const metadata = {
  title: "Profile · Spiral Inward",
  description: "Your account and birth details.",
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Profile is only for real accounts — guests get sent to sign in.
  if (!user) redirect("/sign-in")

  const { data: profile } = await supabase
    .from("profiles")
    .select("birth_date, birth_time, birth_place")
    .eq("id", user.id)
    .maybeSingle()

  const hasRealBirthData =
    !!profile && !!profile.birth_place && profile.birth_place !== "pending"

  return (
    <ProfileView
      email={user.email ?? ""}
      birthDate={hasRealBirthData ? profile!.birth_date : null}
      birthTime={hasRealBirthData ? profile!.birth_time : null}
      birthPlace={hasRealBirthData ? profile!.birth_place : null}
    />
  )
}
