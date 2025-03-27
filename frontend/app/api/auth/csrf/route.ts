export async function GET() {
  try {
    const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000"
    console.log("API route: Getting CSRF token...")

    // Get CSRF token from Django
    const response = await fetch(`${BACKEND_URL}/api/auth/login/`, {
      method: "GET",
      credentials: "include",
    })

    if (!response.ok) {
      return Response.json(
        { error: "Failed to get CSRF token" },
        { status: response.status }
      )
    }

    const data = await response.json()
    return Response.json({ csrf: data.csrf })
  } catch (error) {
    console.error("Error in CSRF API route:", error)
    return Response.json(
      { error: "An error occurred while processing your request" },
      { status: 500 }
    )
  }
}
