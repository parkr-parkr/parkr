"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shadcn/card"
import { useAuth } from "@/components/providers/auth-provider"

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const { setUserAndToken, loginWithToken } = useAuth()

  useEffect(() => {
    if (!token) {

      router.push("/login?error=no-token&message=No verification token provided. Please check your email link.")
      return
    }

    const verifyEmailAndLogin = async () => {
      try {
        console.log("Verifying email and logging in with token:", token)

        const result = await ApiClient.get<{ user: any; token: string }>(
          `/auth/verify-and-login/${token}/`,
        )

        if (response.ok) {
          const data = await response.json()
          console.log("Verification and login success data:", data)

          setStatus("success")

          if (data.user && data.token) {
            // Use the setUserAndToken function to update auth state
            setUserAndToken(data.user, data.token)

            // Redirect to home page after a short delay
            setTimeout(() => {
              router.push("/")
            }, 1500)
          } else {
            // If we only got a token but no user data, try to login with the token
            if (data.token && !data.user) {
              const loginResult = await loginWithToken(data.token)

              if (loginResult.success) {
                // Redirect to home page after a short delay
                setTimeout(() => {
                  router.push("/")
                }, 1500)
              } else {
                throw new Error("Failed to login with token: " + loginResult.error)
              }
            } else {
              throw new Error("Missing user data or token in response")
            }
          }
        } else {
          const data = await response.json().catch(() => ({}))
          console.log("Verification error data:", data)
          setStatus("error")

          // Redirect to login page with error message
          const errorMessage = data.error || "Failed to verify email. The link may be invalid or expired."
          router.push(
            `/login?error=verification-failed&message=${encodeURIComponent(errorMessage)}&email=${encodeURIComponent(data.email || "")}`,
          )
        }
      } catch (error) {
        console.error("Verification error:", error)
        setStatus("error")

        // Redirect to login page with generic error message
        router.push(
          "/login?error=verification-error&message=An error occurred while verifying your email. Please try again later.",
        )
      }
    }

    verifyEmailAndLogin()
  }, [token, router, setUserAndToken, loginWithToken])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Email Verification</CardTitle>
          <CardDescription>Verifying your email address...</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center space-y-4 text-center py-8">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
          <p>Please wait while we verify your email...</p>
          {status === "success" && (
            <p className="text-green-500 font-medium mt-4">
              Email verified successfully! Redirecting you to the home page...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
