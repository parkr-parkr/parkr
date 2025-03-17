"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast-context"
import { PlusCircle, Loader2 } from "lucide-react"
import { useAuth } from "@/components/auth-provider"

interface ListDrivewayButtonProps {
  className?: string
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
  size?: "default" | "sm" | "lg" | "icon"
  children?: React.ReactNode
}

export function ListDrivewayButton({
  className,
  variant = "default",
  size = "default",
  children,
}: ListDrivewayButtonProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { user, checkAuth } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [permissionChecked, setPermissionChecked] = useState(false)

  // Check permission when component mounts or user changes
  useEffect(() => {
    if (user) {
      checkPermission()
    }
  }, [user])

  const checkPermission = async () => {
    if (!user) return

    try {
      console.log("Checking permissions...")
      const permissionResponse = await fetch("http://localhost:8000/api/auth/permissions/", {
        credentials: "include",
      })

      console.log("Permission check response:", permissionResponse.status)

      if (permissionResponse.ok) {
        try {
          const data = await permissionResponse.json()
          console.log("Permission data:", data)
          setHasPermission(data.can_list_driveway)
        } catch (parseError) {
          console.error("Failed to parse permission response:", parseError)
          // For development, optionally assume permission
          if (process.env.NODE_ENV === "development") {
            setHasPermission(true)
          } else {
            setHasPermission(false)
          }
        }
      } else {
        setHasPermission(false)
      }
    } catch (error) {
      console.error("Error checking permissions:", error)
      setHasPermission(false)
    } finally {
      setPermissionChecked(true)
    }
  }

  const handleClick = async () => {
    setIsLoading(true)

    try {
      // First, check if the user is authenticated
      if (!user) {
        // If not authenticated, redirect to login
        router.push("/login?redirect=/dashboard/list-driveway")
        return
      }

      try {
        // Check if the user has permission
        console.log("Checking permissions...")
        const permissionResponse = await fetch("http://localhost:8000/api/auth/permissions/", {
          credentials: "include",
        })

        console.log("Permission check response:", permissionResponse.status)

        // If we get a 401, the user is not authenticated
        if (permissionResponse.status === 401) {
          router.push("/login?redirect=/dashboard/list-driveway")
          return
        }

        // If the response is successful, try to parse it
        if (permissionResponse.ok) {
          try {
            const responseText = await permissionResponse.text()
            console.log("Permission response text (first 100 chars):", responseText.substring(0, 100))

            // Only try to parse as JSON if it looks like JSON
            if (responseText.trim().startsWith("{")) {
              const permissionData = JSON.parse(responseText)
              console.log("Permission data:", permissionData)

              // If the user has permission to list a driveway, navigate directly to the form
              if (permissionData && permissionData.can_list_driveway) {
                router.push("/dashboard/list-driveway")
                return
              }
            }
          } catch (parseError) {
            console.error("Failed to parse permission response:", parseError)
          }
        }

        // If we're in development mode and want to bypass permission checks
        if (process.env.NODE_ENV === "development") {
          // Optional: Uncomment to bypass permission checks in development
          // router.push("/dashboard/list-driveway");
          // return;
        }

        // If we get here, the user doesn't have permission or we couldn't verify
        // Redirect to the become-host page
        router.push("/dashboard/become-host")
      } catch (error) {
        console.error("Error during permission check:", error)

        // If there's an error, navigate to the become-host page as a fallback
        toast({
          title: "Permission check failed",
          description: "Redirecting to host registration page...",
          variant: "destructive",
        })

        setTimeout(() => {
          router.push("/dashboard/become-host")
        }, 1500)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button onClick={handleClick} disabled={isLoading} variant={variant} size={size} className={className}>
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : children ? (
        children
      ) : (
        <>
          <PlusCircle className="mr-2 h-4 w-4" />
          List Your Driveway
        </>
      )}
    </Button>
  )
}

