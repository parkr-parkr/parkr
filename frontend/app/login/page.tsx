"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { CarFront, ArrowLeft, Mail, Lock, Eye, EyeOff } from "lucide-react"

import { Button } from "@/components/shadcn/button"
import { Input } from "@/components/shadcn/input"
import { Separator } from "@/components/shadcn/separator"
import { useAuth } from "@/components/providers/auth-provider"
import { PreventTextEditing } from "../page-fix"
import { ResendVerification } from "@/components/features/resend-verification"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, user, isLoading: authLoading } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [alertState, setAlertState] = useState<{
    type: "success" | "error" | "warning" | "info" | null
    message: string | null
    email?: string | null
  }>({ type: null, message: null })
  const justRegistered = searchParams.get("registered") === "true"

  // Set initial alert if just registered
  useEffect(() => {
    if (justRegistered) {
      setAlertState({
        type: "success",
        message: "Account created successfully! Please check your email to verify your account before logging in.",
      })
    }
  }, [justRegistered])

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push("/")
    }
  }, [user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Form submitted with:", { email, password })
    setAlertState({ type: null, message: null })
    setIsLoading(true)

    try {
      console.log("Calling login function...")
      const result = await login(email, password)
      console.log("Login result:", result)

      if (result.success) {
        
        console.log("Login successful, redirecting to home page")
        router.push("/")
      } else {
        console.log("Login failed:", result.error)

        if (result.error && result.error.toLowerCase().includes("verify")) {
          setAlertState({
            type: "warning",
            message:
              "Your account is not verified. Please check your email for a verification link or click below to resend it.",
            email: email,
          })
        } else {
          setAlertState({
            type: "error",
            message: result.error || "Login failed",
          })
        }
      }
    } catch (err) {
      console.error("Login error:", err)
      setAlertState({
        type: "error",
        message: "An unexpected error occurred",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container max-w-6xl mx-auto flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <Link href="/" className="flex items-center gap-2">
                <CarFront className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold">ParkShare</span>
              </Link>
            </div>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-lg">Loading...</div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PreventTextEditing />

      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-6xl mx-auto flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <CarFront className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">ParkShare</span>
            </Link>
          </div>
          <Link href="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
            <p className="mt-2 text-sm text-muted-foreground">Log in to your account to continue</p>
          </div>

          {alertState.type && alertState.message && (
            <div
              className={`text-sm p-4 rounded-md ${
                alertState.type === "success"
                  ? "bg-green-100 text-green-800"
                  : alertState.type === "error"
                    ? "bg-destructive/10 text-destructive"
                    : alertState.type === "warning"
                      ? "bg-amber-50 border border-amber-200 text-amber-800"
                      : "bg-blue-100 text-blue-800"
              }`}
            >
              <p className={alertState.type === "warning" ? "mb-3" : ""}>{alertState.message}</p>
              {alertState.type === "warning" && alertState.email && <ResendVerification email={alertState.email} />}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pl-10 pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Logging in..." : "Log in"}
              </Button>
              <div className="text-center text-sm">
                <Link href="/forgot-password" className="text-primary hover:underline">
                  Forgot your password?
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" type="button" disabled={isLoading}>
                Google
              </Button>
              <Button variant="outline" type="button" disabled={isLoading}>
                Facebook
              </Button>
            </div>

            <div className="text-center text-sm">
              Don't have an account?{" "}
              <Link href="/signup" className="text-primary hover:underline">
                Sign up
              </Link>
            </div>
          </form>
        </div>
      </main>

      <footer className="border-t py-6">
        <div className="container max-w-6xl mx-auto px-4">
          <p className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} ParkShare, Inc. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
