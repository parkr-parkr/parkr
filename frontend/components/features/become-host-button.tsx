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
      console.log("Sending become host request...");
      console.log("Current user:", user);
      
      // Make direct request to the backend
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      console.log("Using backend URL:", BACKEND_URL);
      
      // First, try to get a CSRF token
      const csrfResponse = await fetch(`${BACKEND_URL}/api/auth/login/`, {
        method: "GET",
        credentials: "include",
      });
      console.log("CSRF response status:", csrfResponse.status);
      
      // Now make the actual request
      const response = await fetch(`${BACKEND_URL}/api/auth/become-host/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest"
        }
      });

      console.log("Response status:", response.status);
      console.log("Response headers:", Object.fromEntries([...response.headers.entries()]));
      
      // Try to parse the response as text first to see what we're getting
      const responseText = await response.text();
      console.log("Response text:", responseText);
      
      // If not OK, throw an error
      if (!response.ok) {
        let errorMessage = "Failed to become a host";
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          console.error("Error parsing error response:", e);
        }
        throw new Error(errorMessage);
      }

      // Parse the response as JSON
      let data;
      try {
        data = JSON.parse(responseText);
        console.log("Success response:", data);
      } catch (e) {
        console.error("Error parsing success response:", e);
        throw new Error("Invalid response from server");
      }
      
      // Refresh the user data to update the UI
      if (typeof refreshUser === 'function') {
        console.log("Refreshing user data...");
        await refreshUser();
        console.log("User data refreshed:", user);
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
