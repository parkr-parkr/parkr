'use client'


import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  useEffect(() => {
    if (!token) {
      setStatus("error")
      setMessage("No verification token provided. Please check your email link.")
      return
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/auth/verify-email/${token}`, {
          method: "GET",
        })

        if (response.ok) {
          setStatus("success")
          setMessage("Your email has been successfully verified!")
        } else {
          const data = await response.json().catch(() => ({}))
          setStatus("error")
          setMessage(data.message || "Failed to verify email. The link may be invalid or expired.")
        }
      } catch (error) {
        setStatus("error")
        setMessage("An error occurred while verifying your email. Please try again later.")
      }
    }

    verifyEmail()
  }, [token])

  const goToLogin = () => {
    router.push("/login")
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Email Verification</CardTitle>
          <CardDescription>{status === "loading" ? "Verifying your email address..." : ""}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center space-y-4 text-center">
          {status === "loading" && (
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
              <p>Please wait while we verify your email...</p>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
              <p className="text-lg font-medium text-green-500">{message}</p>
              <p>You can now log in to your account.</p>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center space-y-4">
              <XCircle className="h-16 w-16 text-red-500" />
              <p className="text-lg font-medium text-red-500">{message}</p>
              <p>Please request a new verification link.</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          {status !== "loading" && (
            <Button onClick={goToLogin}>{status === "success" ? "Go to Login" : "Back to Login"}</Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
