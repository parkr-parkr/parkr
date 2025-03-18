"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { CarFront, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/components/auth-provider"
import { PreventTextEditing } from "../../page-fix"

export default function BecomeHostPage() {
  const router = useRouter()
  const { user, checkAuth } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")
  const [message, setMessage] = useState("")
  const [debugInfo, setDebugInfo] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState(false)
  const [permissionCheckCount, setPermissionCheckCount] = useState(0)
  const [csrfToken, setCsrfToken] = useState<string | null>(null)

  // Check if user already has permission when the component loads
  useEffect(() => {
    if (user) {
      checkUserPermission()
      fetchCsrfToken()
    }
  }, [user, permissionCheckCount])

  // Function to fetch CSRF token
  const fetchCsrfToken = async () => {
    try {
      // Get CSRF token from the cookie
      const cookies = document.cookie.split(";")
      const csrfCookie = cookies.find((cookie) => cookie.trim().startsWith("csrftoken="))
      if (csrfCookie) {
        const token = csrfCookie.split("=")[1]
        setCsrfToken(token)
        console.log("Found CSRF token in cookies:", token)
      } else {
        // If no token in cookies, try to get one from the server
        console.log("No CSRF token found in cookies, fetching from server...")
        const response = await fetch("http://localhost:8000/api/auth/csrf/", {
          credentials: "include",
        })

        if (response.ok) {
          // Check cookies again after the request
          const cookies = document.cookie.split(";")
          const csrfCookie = cookies.find((cookie) => cookie.trim().startsWith("csrftoken="))
          if (csrfCookie) {
            const token = csrfCookie.split("=")[1]
            setCsrfToken(token)
            console.log("Fetched CSRF token:", token)
          }
        }
      }
    } catch (error) {
      console.error("Error fetching CSRF token:", error)
    }
  }

  // Function to check if the user has permission
  const checkUserPermission = async () => {
    try {
      console.log("Checking user permission...")
      const response = await fetch("http://localhost:8000/api/auth/permissions/", {
        credentials: "include",
      })

      if (response.ok) {
        const data = await response.json()
        console.log("Permission check response:", data)

        const hasListingPermission = data.can_list_driveway === true
        console.log("Has listing permission:", hasListingPermission)

        setHasPermission(hasListingPermission)

        if (hasListingPermission) {
          setStatus("success")
          setMessage("You have permission to list driveways!")
          return true
        }
        return false
      } else {
        console.error("Permission check failed with status:", response.status)
        return false
      }
    } catch (error) {
      console.error("Error checking permissions:", error)
      return false
    }
  }

  // Try the original endpoint with CSRF token
  const handleRequestPermission = async () => {
    if (!user) {
      setStatus("error")
      setMessage("You must be logged in to request permission")
      return
    }

    setIsLoading(true)
    setStatus("idle")
    setMessage("")
    setDebugInfo(null)

    try {
      console.log("Sending permission request...")

      // Headers with CSRF token if available
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }

      if (csrfToken) {
        headers["X-CSRFToken"] = csrfToken
      }

      // Use the original endpoint
      const response = await fetch("http://localhost:8000/api/auth/grant_driveway_permission/", {
        method: "POST",
        headers,
        credentials: "include",
      })

      console.log("Permission request response status:", response.status)

      // Try to get the response data
      let responseData
      try {
        responseData = await response.json()
        console.log("Response data:", responseData)
      } catch (e) {
        console.error("Failed to parse response as JSON:", e)
        const text = await response.text()
        console.log("Response text:", text)
        responseData = { error: "Failed to parse response" }
      }

      if (response.ok) {
        // Set success state
        setStatus("success")
        setMessage(responseData.message || "Permission granted successfully!")

        // Wait a moment before refreshing auth
        await new Promise((resolve) => setTimeout(resolve, 500))

        // Refresh auth to get updated permissions
        await checkAuth()

        // Trigger a permission check
        setPermissionCheckCount((prev) => prev + 1)
      } else {
        // Handle error
        setStatus("error")
        setMessage(responseData.error || `Failed with status: ${response.status}`)
        setDebugInfo(
          JSON.stringify(
            {
              status: response.status,
              data: responseData,
            },
            null,
            2,
          ),
        )
      }
    } catch (error) {
      console.error("Error requesting permission:", error)
      setStatus("error")
      setMessage(`Network error: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Try the places API endpoint as an alternative
  const handleRequestViaPlacesAPI = async () => {
    if (!user) {
      setStatus("error")
      setMessage("You must be logged in to request permission")
      return
    }

    setIsLoading(true)
    setStatus("idle")
    setMessage("")
    setDebugInfo(null)

    try {
      console.log("Sending permission request via places API...")

      // Headers with CSRF token if available
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }

      if (csrfToken) {
        headers["X-CSRFToken"] = csrfToken
      }

      // Use the places API endpoint
      const response = await fetch("http://localhost:8000/api/places/request_listing_permission/", {
        method: "POST",
        headers,
        credentials: "include",
      })

      console.log("Permission request response status:", response.status)

      // Try to get the response data
      let responseData
      try {
        responseData = await response.json()
        console.log("Response data:", responseData)
      } catch (e) {
        console.error("Failed to parse response as JSON:", e)
        const text = await response.text()
        console.log("Response text:", text)
        responseData = { error: "Failed to parse response" }
      }

      if (response.ok) {
        // Set success state
        setStatus("success")
        setMessage(responseData.message || "Permission granted successfully!")

        // Wait a moment before refreshing auth
        await new Promise((resolve) => setTimeout(resolve, 500))

        // Refresh auth to get updated permissions
        await checkAuth()

        // Trigger a permission check
        setPermissionCheckCount((prev) => prev + 1)
      } else {
        // Handle error
        setStatus("error")
        setMessage(responseData.error || `Failed with status: ${response.status}`)
        setDebugInfo(
          JSON.stringify(
            {
              status: response.status,
              data: responseData,
            },
            null,
            2,
          ),
        )
      }
    } catch (error) {
      console.error("Error requesting permission:", error)
      setStatus("error")
      setMessage(`Network error: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Use the Django management command directly
  const handleManualPermissionGrant = async () => {
    if (!user) {
      setStatus("error")
      setMessage("You must be logged in to request permission")
      return
    }

    setIsLoading(true)
    setStatus("idle")
    setMessage("")
    setDebugInfo(null)

    try {
      // Show instructions for manual permission grant
      setStatus("success")
      setMessage("For development, run this command in your Django project:")
      setDebugInfo(`python backend/manage.py grant_driveway_permission ${user.email}`)

      // Set local permission state to true for development
      setHasPermission(true)
    } catch (error) {
      console.error("Error:", error)
      setStatus("error")
      setMessage(`Error: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleContinueToListing = () => {
    router.push("/dashboard/list-driveway")
  }

  // For development: This function will directly set the permission in local state
  // without making any API calls - useful if the backend is not working
  const handleForcePermission = () => {
    setStatus("success")
    setMessage("Permission forced in local state (frontend only)")
    setHasPermission(true)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PreventTextEditing />

      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-6xl mx-auto flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <CarFront className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">ParkShare</span>
            </Link>
          </div>
          <Link
            href="/dashboard"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="flex-1 container max-w-6xl mx-auto py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Become a Host</h1>

          <Card>
            <CardHeader>
              <CardTitle>List Your Driveway</CardTitle>
              <CardDescription>Share your unused parking space and earn extra income</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Before you can list your driveway, we need to verify your account. This helps ensure the safety and
                quality of our platform.
              </p>

              <div className="bg-blue-50 text-blue-700 p-4 rounded-md">
                <p className="font-medium">Permission Status</p>
                <p>Current permission status: {hasPermission ? "Granted" : "Not granted"}</p>
                <Button
                  variant="link"
                  className="p-0 h-auto text-blue-700"
                  onClick={() => setPermissionCheckCount((prev) => prev + 1)}
                >
                  Refresh Status
                </Button>
              </div>

              {status === "success" && (
                <div className="bg-green-50 text-green-700 p-4 rounded-md flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Permission Granted!</p>
                    <p>{message}</p>
                    {debugInfo && (
                      <pre className="mt-2 p-2 bg-green-100 rounded text-xs overflow-x-auto">{debugInfo}</pre>
                    )}
                    {!debugInfo && <p className="mt-2">You can now list your driveway for rent.</p>}
                  </div>
                </div>
              )}

              {status === "error" && (
                <div className="bg-red-50 text-red-700 p-4 rounded-md flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Error</p>
                    <p>{message}</p>
                    {debugInfo && (
                      <details className="mt-2 text-xs">
                        <summary>Technical Details</summary>
                        <pre className="mt-1 p-2 bg-red-100 rounded overflow-x-auto">{debugInfo}</pre>
                      </details>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              {!hasPermission ? (
                <>
                  <Button
                    onClick={handleRequestPermission}
                    disabled={isLoading || status === "success"}
                    className="w-full"
                  >
                    {isLoading ? "Processing..." : "Request Host Permission"}
                  </Button>
                  <Button
                    onClick={handleRequestViaPlacesAPI}
                    variant="outline"
                    disabled={isLoading || status === "success"}
                    className="w-full"
                  >
                    {isLoading ? "Processing..." : "Try Alternative Method"}
                  </Button>
                  <Button
                    onClick={handleManualPermissionGrant}
                    variant="outline"
                    disabled={isLoading || status === "success"}
                    className="w-full"
                  >
                    Manual Permission Grant
                  </Button>
                </>
              ) : (
                <Button onClick={handleContinueToListing} className="w-full">
                  Continue to Listing Form
                </Button>
              )}

              {/* Development mode buttons - remove in production */}
              <div className="w-full pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-2 text-center">Development Options</p>
                <Button
                  onClick={handleForcePermission}
                  variant="outline"
                  size="sm"
                  disabled={isLoading || hasPermission}
                  className="w-full"
                >
                  Force Permission (UI Only)
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </main>

      <footer className="border-t py-6">
        <div className="container max-w-6xl mx-auto px-4">
          <p className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} ParkShare, Inc. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}

