import { NextResponse } from "next/server"

export async function POST() {
  try {
    // Make the request to the Django backend
    const response = await fetch("http://localhost:8000/api/auth/grant_driveway_permission/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    })

    // Get the response data
    let responseData
    try {
      responseData = await response.json()
    } catch (error) {
      // If the response is not JSON, get the text
      const text = await response.text()
      responseData = { message: text.substring(0, 500) }
    }

    // If the response is not ok, return an error
    if (!response.ok) {
      console.error("Error from backend:", responseData)
      return NextResponse.json(
        {
          error: responseData.error || `Failed with status: ${response.status}`,
          details: responseData,
        },
        { status: response.status },
      )
    }

    // Return the successful response
    return NextResponse.json({
      message: responseData.message || "Permission granted successfully",
      status: "success",
      details: responseData,
    })
  } catch (error) {
    console.error("Error in grant-permission API route:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
        status: "error",
      },
      { status: 500 },
    )
  }
}

