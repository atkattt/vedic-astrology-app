import { cookies } from "next/headers"
import { NextResponse } from "next/server"

// Enter the experience as a guest: set a lightweight cookie and drop the
// visitor straight into their circle. No account required.
export async function GET(request: Request) {
  const cookieStore = await cookies()
  // In development the v0 preview renders inside a cross-site iframe, so the
  // cookie must be SameSite=None; Secure or the browser silently drops it and
  // the guest is bounced to sign-in. Mirror the Better Auth cookie attributes.
  const isDev = process.env.NODE_ENV === "development"
  cookieStore.set("spiral_guest", "1", {
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    sameSite: isDev ? "none" : "lax",
    secure: isDev ? true : undefined,
  })
  return NextResponse.redirect(new URL("/circle", request.url))
}
