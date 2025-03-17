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

      // Use direct backend URL with trailing slash
      const response = await fetch(`${BACKEND_URL}/api/auth/profile/`, {
        credentials: "include",
      })

      if (response.ok) {
        const userData = await response.json()
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
    try {
      setIsLoading(true)

      // Use direct backend URL with trailing slash
      const apiUrl = `${BACKEND_URL}/api/auth/login/`

      console.log("Sending login request to:", apiUrl)

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      })

      console.log("Login response status:", response.status)
      console.log("Login response headers:", Object.fromEntries([...response.headers.entries()]))

      // Check if the response is JSON
      const contentType = response.headers.get("content-type")
      console.log("Response content type:", contentType)

      if (!contentType || !contentType.includes("application/json")) {
        console.error("Received non-JSON response:", contentType)

        // Try to get the text response for debugging
        const textResponse = await response.text()
        console.error("Response text:", textResponse.substring(0, 500) + "...")

        return {
          success: false,
          error: "Server returned an invalid response. Please try again or contact support.",
        }
      }

      const data = await response.json()
      console.log("Login response data:", data)

      if (response.ok) {
        console.log("Setting user data:", data.user)
        setUser(data.user)
        return { success: true }
      } else {
        // Handle specific error messages from the backend
        const errorMessage =
          data.error || (response.status === 401 ? "Invalid email or password" : "Login failed. Please try again.")

        console.error("Login error:", errorMessage)
        return { success: false, error: errorMessage }
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
      // Use direct backend URL with trailing slash
      await fetch(`${BACKEND_URL}/api/auth/logout/`, {
        method: "POST",
        credentials: "include",
      })
      setUser(null)
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  useEffect(() => {
    checkAuth()
  }, [])

  return <AuthContext.Provider value={{ user, isLoading, login, logout, checkAuth }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

