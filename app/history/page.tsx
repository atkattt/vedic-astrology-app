import { auth } from "@/lib/auth"
import { headers, cookies } from "next/headers"
import { redirect } from "next/navigation"
import { HistoryView } from "@/components/spiral/history-view"

export default async function HistoryPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) {
    const cookieStore = await cookies()
    if (cookieStore.get("spiral_guest")?.value !== "1") redirect("/sign-in")
  }

  return <HistoryView />
}
