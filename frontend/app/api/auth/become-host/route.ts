export async function POST(request: Request) {
  try {
    const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000"
    console.log("API route: User becoming a host...")

    // Get cookies from the incoming request
    const cookies = request.headers.get('cookie') || ''

    // Forward the request to Django with cookies
    const response = await fetch(`${BACKEND_URL}/api/auth/become-host/`, {
      method: "POST",
      credentials: "include",
      headers: {
        'Cookie': cookies,
        'Content-Type': 'application/json'
      }
    })

    console.log("Backend response status:", response.status)

    if (!response.ok) {
      let errorMessage = "Failed to become a host"
      try {
        const errorData = await response.json()
        errorMessage = errorData.error || errorMessage
      } catch (e) {
        console.error("Error parsing error response:", e)
      }
      
      console.error("Backend error:", errorMessage)
      return Response.json({ error: errorMessage }, { status: response.status })
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
