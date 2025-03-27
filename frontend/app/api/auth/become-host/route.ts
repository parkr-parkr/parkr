export async function POST() {
  try {
    const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000"
    console.log("API route: User becoming a host...")

    // Forward the request to Django
    const response = await fetch(`${BACKEND_URL}/api/users/become-host/`, {
      method: "POST",
      credentials: "include",
    })

    if (!response.ok) {
      const errorData = await response.json()
      return Response.json(
        { error: errorData.error || "Failed to become a host" },
        { status: response.status }
      )
    }

    const data = await response.json()
    return Response.json(data)
  } catch (error) {
    console.error("Error in become-host API route:", error)
    return Response.json(
      { error: "An error occurred while processing your request" },
      { status: 500 }
    )
  }
}
