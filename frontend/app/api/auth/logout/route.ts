import { NextResponse } from "next/server"

export async function POST() {
  try {
    const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000"
    console.log("API route: Logging out user...")

    // Forward the logout request to Django
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/logout/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      })
      console.log("API route: Django logout response status:", response.status)

      // Continue even if we get a 403
      if (response.status === 403) {
        console.log("API route: Got 403 from Django logout endpoint - continuing with cookie clearing")
      }
    } catch (error) {
      console.error("API route: Error calling Django logout:", error)
    }

    // Create a response that clears cookies
    const nextResponse = NextResponse.json({ success: true, message: "Logged out successfully" }, { status: 200 })

    // Clear all possible auth cookies with various paths
    const cookiesToClear = ["sessionid", "csrftoken", "jwt", "auth_token", "refresh_token"]

    cookiesToClear.forEach((cookieName) => {
      // Clear with path=/
      nextResponse.cookies.delete({
        name: cookieName,
        path: "/",
      })

      // Clear with path=/api
      nextResponse.cookies.delete({
        name: cookieName,
        path: "/api",
      })

      // Clear with empty path
      nextResponse.cookies.delete({
        name: cookieName,
      })
    })

    // Add Cache-Control headers to prevent caching
    nextResponse.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate")
    nextResponse.headers.set("Pragma", "no-cache")
    nextResponse.headers.set("Expires", "0")

    // Add a header to signal to the client that this is a logout response
    nextResponse.headers.set("X-Logout-Completed", "true")

    console.log("API route: Cookies cleared in response")
    return nextResponse
  } catch (error) {
    console.error("API route: Error during logout:", error)

    // Even if there's an error, try to clear cookies
    const errorResponse = NextResponse.json({ success: false, message: "Logout failed" }, { status: 500 })

    const cookiesToClear = ["sessionid", "csrftoken", "jwt", "auth_token", "refresh_token"]

    cookiesToClear.forEach((cookieName) => {
      errorResponse.cookies.delete({
        name: cookieName,
        path: "/",
      })

      errorResponse.cookies.delete({
        name: cookieName,
        path: "/api",
      })

      errorResponse.cookies.delete({
        name: cookieName,
      })
    })

    return errorResponse
  }
}

