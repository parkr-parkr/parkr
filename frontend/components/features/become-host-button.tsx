"use client"

import { useState } from "react"
import { Button } from "@/components/shadcn/button"
import { useToast } from "@/components/shadcn/use-toast"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"

interface BecomeHostButtonProps {
  className?: string
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
  size?: "default" | "sm" | "lg" | "icon"
  children?: React.ReactNode
}

export function BecomeHostButton({
  className,
  variant = "default",
  size = "default",
  children = "Become a Host",
}: BecomeHostButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const { user, refreshUser } = useAuth()

  const handleClick = async () => {
    if (!user) {
      router.push("/login?redirect=/dashboard")
      return
    }

    setIsLoading(true)
    try {
      console.log("Sending become host request...")
      
      // Make direct request to the backend
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      const response = await fetch(`${BACKEND_URL}/api/auth/become-host/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest"
        }
      });

      console.log("Response status:", response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error response:", errorData);
        throw new Error(errorData.error || "Failed to become a host");
      }

      const data = await response.json();
      console.log("Success response:", data);
      
      // Refresh the user data to update the UI
      if (typeof refreshUser === 'function') {
        await refreshUser();
      } else {
        console.warn("refreshUser is not a function, cannot refresh user data");
        // Force a page reload as fallback
        window.location.reload();
      }

      toast({
        title: "Success!",
        description: "You are now a host and can list driveways.",
      });

      // Redirect to the list driveway page
      router.push("/dashboard/list-driveway");
    } catch (error) {
      console.error("Error becoming a host:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to become a host. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button
      className={className}
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={isLoading || (user && user.can_list_driveway)}
    >
      {isLoading ? "Processing..." : user && user.can_list_driveway ? "You are a Host" : children}
    </Button>
  )
}
