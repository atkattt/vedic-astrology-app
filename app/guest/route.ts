import { cookies } from "next/headers"
import { NextResponse } from "next/server"

// Enter the experience as a guest: set a lightweight cookie and drop the
// visitor straight into their circle. No account required.
export async function GET(request: Request) {
  const cookieStore = await cookies()
  cookieStore.set("spiral_guest", "1", {
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    sameSite: "lax",
  })
  return NextResponse.redirect(new URL("/circle", request.url))
}
