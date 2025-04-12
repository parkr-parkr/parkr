"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { CarFront, ArrowLeft, CheckCircle } from "lucide-react"
import { Button } from "@/components/shadcn/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/shadcn/card"
import { useAuth } from "@/components/providers/auth-provider"
import { useToast } from "@/components/shadcn/toast-context"

// Add this import at the top of your file
import { getCookie } from "@/lib/csrf"
import { ApiClient } from "@/lib/api-client"

export default function BecomeHostPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const { toast } = useToast()

  // Replace only the handleBecomeHost function with this updated version
  const handleBecomeHost = async () => {
    if (!user) {
      router.push("/login?redirect=/dashboard/become-host")
      return
    }

    setIsLoading(true)

    try {
      // Get CSRF token from cookies
      let csrfToken = getCookie("csrftoken")

      const result = await ApiClient.post("/api/auth/become-host/", {})
      if (result.success) {
        // Handle success
        setIsSuccess(true)
        toast({
          title: "Success!",
          description: "You are now a host and can list your driveway.",
        })

        // Redirect to the list-driveway page after a short delay
        setTimeout(() => {
          router.push("/dashboard/list-driveway")
        }, 1500)
      } else {
        // Handle failure
        console.error("Request failed:", result.error)
        toast({
          title: "Error",
          description: "Failed to become a host. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      // Handle any unexpected errors
      console.error("Error becoming a host:", error)
      toast({
        title: "Error",
        description: "Something went wrong. Please try again later.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
      <div className="container relative h-[calc(100vh-80px)] md:h-[calc(100vh-120px)]">
        <Link href="/dashboard" className="absolute left-0 top-0">
          <Button variant="ghost">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div className="flex h-full items-center justify-center">
          <Card className="w-[400px]">
            <CardHeader>
              <CardTitle className="flex items-center">
                <CarFront className="mr-2 h-4 w-4" /> Become a Host
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                By becoming a host, you can list your driveway for others to rent.
              </p>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="secondary" onClick={() => router.push("/dashboard")}>
                Cancel
              </Button>
              <Button onClick={handleBecomeHost} disabled={isLoading}>
                {isLoading ? "Loading..." : isSuccess ? <CheckCircle className="mr-2 h-4 w-4" /> : null}
                {isSuccess ? "Success!" : "Become Host"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
  )
}

