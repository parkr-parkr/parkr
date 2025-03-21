"use client"

import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from "react"

type User = {
  id: string
  email: string
  username: string
  first_name: string
  last_name: string
  full_name: string
  is_verified: boolean
}

type AuthContextType = {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
  isBackendAvailable: boolean | null
  checkBackendStatus: () => Promise<boolean>
  checkSession: () => Promise<any>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Use direct backend URL with trailing slashes
const BACKEND_URL = "http://localhost:8000"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const authCheckInProgress = useRef(false)
  const lastAuthCheck = useRef<number>(0)
  const AUTH_CHECK_THROTTLE = 5000 // 5 seconds
  // Add a new state for backend status
  const [isBackendAvailable, setIsBackendAvailable] = useState<boolean | null>(null)

  // Replace the checkBackendStatus function with this version that doesn't use /api/status
  const checkBackendStatus = async () => {
    try {
      console.log("Checking backend availability...")
      const response = await fetch(`${BACKEND_URL}/api/auth/login/`, {
        method: "OPTIONS",
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers": "content-type",
          Origin: window.location.origin,
        },
      })

      const isAvailable = response.ok || response.status === 200 || response.status === 204
      console.log("Backend availability check result:", isAvailable, "Status:", response.status)
      setIsBackendAvailable(isAvailable)
      return isAvailable
    } catch (error) {
      console.error("Backend availability check failed:", error)
      setIsBackendAvailable(false)
      return false
    }
  }

  // Simplified check session function that doesn't require a backend endpoint
  const checkSession = async () => {
    try {
      // Just log the cookies for debugging
      console.log("Current cookies:", document.cookie)
      return { cookies: document.cookie }
    } catch (error) {
      console.error("Error checking session:", error)
      return null
    }
  }

  // Check if user is authenticated on initial load
  const checkAuth = async () => {
    // Prevent multiple simultaneous auth checks
    if (authCheckInProgress.current) {
      console.log("Auth check already in progress, skipping")
      return
    }

    // Throttle auth checks to prevent too many requests
    const now = Date.now()
    if (now - lastAuthCheck.current < AUTH_CHECK_THROTTLE) {
      console.log("Auth check throttled, skipping")
      return
    }

    try {
      authCheckInProgress.current = true
      setIsLoading(true)
      lastAuthCheck.current = now

      console.log("Checking authentication status...")

      // First try the direct backend URL
      let userData = null
      let directBackendSuccess = false

      try {
        // Use direct backend URL with trailing slash
        console.log("Trying direct backend URL:", `${BACKEND_URL}/api/auth/profile/`)
        const directResponse = await fetch(`${BACKEND_URL}/api/auth/profile/`, {
          credentials: "include",
        })

        if (directResponse.ok) {
          userData = await directResponse.json()
          directBackendSuccess = true
          console.log("Direct backend auth check successful:", userData)

          // Check session for debugging
          // await checkSession()
        } else {
          console.log("Direct backend auth check failed with status:", directResponse.status)
        }
      } catch (directError) {
        console.error("Direct backend auth check error:", directError)
      }

      // If direct backend fails, try the Next.js API route
      if (!directBackendSuccess) {
        try {
          console.log("Trying Next.js API route for auth check")
          const nextResponse = await fetch("/api/auth/profile/", {
            credentials: "include",
          })

          if (nextResponse.ok) {
            userData = await nextResponse.json()
            console.log("Next.js API route auth check successful:", userData)
          } else {
            console.log("Next.js API route auth check failed with status:", nextResponse.status)
          }
        } catch (nextError) {
          console.error("Next.js API route auth check error:", nextError)
        }
      }

      // Update user state based on the results
      if (userData) {
        setUser(userData)
        return userData
      } else {
        setUser(null)
        return null
      }
    } catch (error) {
      console.error("Auth check failed:", error)
      setUser(null)
      return null
    } finally {
      setIsLoading(false)
      authCheckInProgress.current = false
    }
  }

  // Login function
  const login = async (email: string, password: string) => {
    console.log("Login function called with email:", email)

    // Check if backend is available
    const isAvailable = await checkBackendStatus()
    if (!isAvailable) {
      return {
        success: false,
        error: "Backend server is not available. Please make sure the Django server is running.",
      }
    }

    try {
      setIsLoading(true)

      // Try direct backend first
      let loginSuccess = false
      let userData = null
      let errorMessage = null

      try {
        // Use direct backend URL with trailing slash
        const apiUrl = `${BACKEND_URL}/api/auth/login/`
        console.log("Trying direct login to:", apiUrl)

        const directResponse = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ email, password }),
        })

        console.log("Direct login response status:", directResponse.status)

        // Log cookies after login
        console.log("Cookies after login:", document.cookie)

        if (directResponse.ok) {
          const data = await directResponse.json()
          userData = data.user
          loginSuccess = true
          console.log("Direct login successful:", userData)

          // Log session ID if available
          if (data.session_id) {
            console.log("Session ID from server:", data.session_id)
          }

          // Check session for debugging
          // await checkSession()
        } else {
          const errorData = await directResponse.json().catch(() => ({ error: "Invalid response from server" }))
          errorMessage = errorData.error || "Login failed"
          console.error("Direct login failed:", errorMessage)
        }
      } catch (directError) {
        console.error("Direct login error:", directError)
        errorMessage = `Network error: ${directError instanceof Error ? directError.message : String(directError)}`
      }

      // If direct login fails, try through Next.js API route
      if (!loginSuccess) {
        try {
          console.log("Trying login through Next.js API route")
          const nextResponse = await fetch("/api/auth/login/", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, password }),
          })

          console.log("Next.js API route login response status:", nextResponse.status)

          if (nextResponse.ok) {
            const data = await nextResponse.json()
            userData = data.user
            loginSuccess = true
            console.log("Next.js API route login successful:", userData)
          } else {
            const errorData = await nextResponse.json().catch(() => ({ error: "Invalid response from server" }))
            errorMessage = errorData.error || "Login failed"
            console.error("Next.js API route login failed:", errorMessage)
          }
        } catch (nextError) {
          console.error("Next.js API route login error:", nextError)
          errorMessage =
            errorMessage || `Network error: ${nextError instanceof Error ? nextError.message : String(nextError)}`
        }
      }

      // Update user state based on login result
      if (loginSuccess && userData) {
        setUser(userData)
        return { success: true }
      } else {
        return {
          success: false,
          error: errorMessage || "Login failed. Please try again.",
        }
      }
    } catch (error) {
      console.error("Login error:", error)
      return {
        success: false,
        error: "An unexpected error occurred. Please check your network connection and try again.",
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Logout function
  const logout = async () => {
    try {
      console.log("Logging out user...")
      console.log("Cookies before logout:", document.cookie)

      // Try direct backend first
      try {
        // Use direct backend URL with trailing slash
        console.log("Trying direct logout")
        const response = await fetch(`${BACKEND_URL}/api/auth/logout/`, {
          method: "POST",
          credentials: "include", // Important for sending cookies
          headers: {
            "Content-Type": "application/json",
          },
        })

        console.log("Logout response status:", response.status)
      } catch (directError) {
        console.error("Direct logout error:", directError)
      }

      // Also try the Next.js API route as a backup
      try {
        console.log("Trying Next.js API route for logout")
        await fetch("/api/auth/logout/", {
          method: "POST",
          credentials: "include",
        })
      } catch (nextError) {
        console.error("Next.js API route logout error:", nextError)
      }

      // Manually clear all possible cookies with different paths and domains
      console.log("Manually clearing cookies...")

      // Get all cookies
      const cookies = document.cookie.split(";")
      console.log("Cookies to clear:", cookies)

      // Clear each cookie with various path combinations
      cookies.forEach((cookie) => {
        const [name] = cookie.trim().split("=")
        if (name) {
          const trimmedName = name.trim()
          // Clear with path=/
          document.cookie = `${trimmedName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`
          // Clear with no path (defaults to current path)
          document.cookie = `${trimmedName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT;`
          // Clear with path=/api
          document.cookie = `${trimmedName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/api;`

          console.log(`Cleared cookie: ${trimmedName}`)
        }
      })

      // Log cookies after clearing
      console.log("Cookies after clearing:", document.cookie)

      // Always clear the user state
      setUser(null)

      // Add a small delay before redirecting to ensure cookies are processed
      console.log("Preparing to redirect...")
      setTimeout(() => {
        console.log("Redirecting to home page...")
        // Force a page reload to clear any cached state
        window.location.replace("/")
      }, 100)

      return true
    } catch (error) {
      console.error("Logout error:", error)
      // Still clear the user state
      setUser(null)

      // Force a page reload as a last resort
      console.log("Error during logout, forcing page reload...")
      setTimeout(() => {
        window.location.replace("/")
      }, 100)
    }
  }

  // Update the useEffect to check backend status first
  useEffect(() => {
    const initAuth = async () => {
      const isAvailable = await checkBackendStatus()
      if (isAvailable) {
        checkAuth()
      } else {
        setIsLoading(false)
      }
    }

    initAuth()

    // Check backend status periodically
    const interval = setInterval(checkBackendStatus, 60000) // every minute
    return () => clearInterval(interval)
  }, [])

  // Update the AuthContext.Provider to include isBackendAvailable
  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        checkAuth,
        isBackendAvailable,
        checkBackendStatus,
        checkSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

