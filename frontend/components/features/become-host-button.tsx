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
  const { user, checkAuth } = useAuth()

  const handleClick = async () => {
    if (!user) {
      router.push("/login?redirect=/dashboard")
      return
    }

    setIsLoading(true)
    try {
      console.log("Sending become host request...");
      
      // Use credentials: 'include' which is critical for sending cookies
      const response = await fetch("http://localhost:8000/api/auth/become-host/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("Response status:", response.status);
      
      if (!response.ok) {
        throw new Error("Failed to become a host");
      }

      const data = await response.json();
      console.log("Success response:", data);
      
      // Refresh the user data to update the UI
      await checkAuth();

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
        description: "Failed to become a host. Please try again.",
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
