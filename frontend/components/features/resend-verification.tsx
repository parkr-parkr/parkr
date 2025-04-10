"use client"

import { useState } from "react"
import { Button } from "@/components/shadcn/button"

interface ResendVerificationProps {
  email: string
}

export function ResendVerification({ email }: ResendVerificationProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleResend = async () => {
    setIsLoading(true)
    setMessage(null)
    setError(null)

    try {
      const response = await fetch("http://localhost:8000/api/auth/resend-verification/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage("Verification email sent! Please check your inbox.")
      } else {
        setError(data.error || "Failed to resend verification email")
      }
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="mt-4">
      {message && <div className="bg-green-100 text-green-800 text-sm p-3 rounded-md mb-3">{message}</div>}
      {error && <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md mb-3">{error}</div>}

      <Button type="button" variant="outline" size="sm" onClick={handleResend} disabled={isLoading} className="w-full">
        {isLoading ? "Sending..." : "Resend verification email"}
      </Button>
    </div>
  )
}
