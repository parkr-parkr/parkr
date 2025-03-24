"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/shadcn/button"
import { useToast } from "@/components/shadcn/toast-context"
import { PlusCircle, Loader2 } from "lucide-react"
import { useAuth } from "@/components/providers/auth-provider"

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
        // If not authenticated, redirect to login with return URL
        router.push("/login?redirect=/dashboard/list-driveway")
        return
      }

      // Always navigate to the list-driveway page
      // Permission checks will happen on that page
      router.push("/dashboard/list-driveway")
    } catch (error) {
      console.error("Navigation error:", error)
      toast({
        title: "Navigation failed",
        description: "Please try again later.",
        variant: "destructive",
      })
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

