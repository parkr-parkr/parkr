"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams, useParams } from "next/navigation"
import { ArrowLeft, Loader2, Eye, EyeOff, CheckCircle, XCircle } from "lucide-react"
import { Button } from "@/components/shadcn/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/shadcn/card"
import { Input } from "@/components/shadcn/input"
import { SimpleLabel } from "@/components/shadcn/simple-label"

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState<"validating" | "ready" | "loading" | "success" | "error">("validating")
  const [message, setMessage] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [confirmPasswordError, setConfirmPasswordError] = useState("")
  const router = useRouter()
  const {uidb64, token} = useParams()

  useEffect(() => {
    // Validate the token
    if (!token) {
      setStatus("error")
      setMessage("Invalid or missing reset token. Please request a new password reset link.")
      return
    }

    setStatus("ready")
  }, [token])

  // Clear validation errors when inputs change
  useEffect(() => {
    setPasswordError("")
  }, [password])

  useEffect(() => {
    setConfirmPasswordError("")
  }, [confirmPassword])

  const validatePassword = () => {
    let isValid = true

    // Reset errors
    setPasswordError("")
    setConfirmPasswordError("")

    // Validate password length
    if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters long")
      isValid = false
    }

    // Validate password match
    if (password !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match")
      isValid = false
    }

    return isValid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate password
    if (!validatePassword()) {
      return
    }

    setStatus("loading")

    try {
      // Add a small delay to ensure the loading state is visible
      await new Promise((resolve) => setTimeout(resolve, 300))

      ApiClient.post(
        "/api/auth/reset-password/",
        { uidb64, token, password },
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 200))
          setStatus("success")
          setMessage("Your password has been reset successfully")
        },
        async (error: any) => {
          await new Promise((resolve) => setTimeout(resolve, 200))
          setStatus("error")
          setMessage(error.message || "Failed to reset password. Please try again.")
        },
      )
    } catch (error) {
      setStatus("error")
      setMessage("An error occurred. Please try again later.")
    }
  }

  const toggleShowPassword = () => {
    setShowPassword(!showPassword)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md transition-all duration-200 ease-in-out">
        <CardHeader className="space-y-1">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" className="mr-2" onClick={() => router.push("/login")}>
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to login</span>
            </Button>
            <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
          </div>
          <CardDescription>Create a new password for your account</CardDescription>
        </CardHeader>
        <CardContent>
          {status === "validating" && (
            <div className="flex flex-col items-center justify-center space-y-4 py-6 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p>Validating your reset link...</p>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-4">
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">{message}</div>
              <div className="flex flex-col items-center justify-center space-y-4 py-6 text-center transition-opacity duration-300">
                <XCircle className="h-12 w-12 text-red-500" />
                <p>Please request a new password reset link.</p>
                <Button onClick={() => router.push("/forgot-password")}>Request New Link</Button>
              </div>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center justify-center space-y-4 py-6 text-center transition-opacity duration-300">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Password Reset Successful</h3>
                <p className="text-sm text-muted-foreground">
                  Your password has been reset successfully. You can now log in with your new password.
                </p>
              </div>
              <Button onClick={() => router.push("/login")} className="mt-2">
                Go to Login
              </Button>
            </div>
          )}

          {(status === "ready" || status === "loading") && (
            <form onSubmit={handleSubmit} className="space-y-4 transition-opacity duration-200">
              <div className="space-y-2">
                <SimpleLabel htmlFor="password">New Password</SimpleLabel>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={status === "loading"}
                    className={passwordError ? "border-red-300 pr-10" : "pr-10"}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={toggleShowPassword}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
                  </Button>
                </div>
                {passwordError ? (
                  <p className="text-xs text-red-500">{passwordError}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Password must be at least 8 characters long</p>
                )}
              </div>

              <div className="space-y-2">
                <SimpleLabel htmlFor="confirmPassword">Confirm New Password</SimpleLabel>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={status === "loading"}
                    className={confirmPasswordError ? "border-red-300" : ""}
                    required
                  />
                </div>
                {confirmPasswordError && <p className="text-xs text-red-500">{confirmPasswordError}</p>}
              </div>

              <Button type="submit" className="w-full" disabled={status === "loading"}>
                {status === "loading" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resetting Password...
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          {status !== "success" && status !== "error" && (
            <div className="text-center text-sm">
              Remember your password?{" "}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Back to login
              </Link>
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
