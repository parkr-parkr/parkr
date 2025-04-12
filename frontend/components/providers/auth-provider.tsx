"use client"

import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from "react"

// Add this function at the top of your auth-provider.tsx file
// to safely handle JSON parsing without using eval() or new Function()
function safeJsonParse(text: string) {
  try {
    return JSON.parse(text)
  } catch (e) {
    console.error("Error parsing JSON:", e)
    return null
  }
}

type User = {
  id: string
  email: string
  username: string
  first_name: string
  last_name: string
  full_name: string
  is_verified: boolean
  can_list_driveway: boolean
  // Add other user properties as needed
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
  // Add these new functions
  setUserAndToken: (user: User, token: string) => void
  loginWithToken: (token: string) => Promise<{ success: boolean; error?: string }>
}

export const checkBackendStatus = async () => {
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

    const csrfToken = response.headers.get("X-CSRFToken")
    if (csrfToken) {
      document.cookie = `csrftoken=${csrfToken}; path=/;`
      console.log("CSRF token set from headers:", csrfToken)
    }

    console.log("Backend availability check result:", isAvailable, "Status:", response.status)
    return isAvailable
  } catch (error) {
    console.error("Backend availability check failed:", error)
    return false
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Use direct backend URL with trailing slashes
const BACKEND_URL = "http://localhost:8000"

// Provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const authCheckInProgress = useRef(false)
  const lastAuthCheck = useRef<number>(0)
  const AUTH_CHECK_THROTTLE = 5000 // 5 seconds
  const [isBackendAvailable, setIsBackendAvailable] = useState<boolean | null>(null)

  // Simplified check session function
  const checkSession = async () => {
    try {
      console.log("Current cookies:", document.cookie)
      return { cookies: document.cookie }
    } catch (error) {
      console.error("Error checking session:", error)
      return null
    }
  }

  // Use effect to call checkbackend status and check if its available AI!

  // Check if user is authenticated on initial load
  const checkAuth = async () => {
    // Prevent multiple simultaneous auth checks
    if (authCheckInProgress.current) {
      console.log("Auth check already in progress, skipping")
      return
    }

    // Throttle auth checks
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

      // Check for JWT token in localStorage
      const token = localStorage.getItem("auth_token")
      if (token) {
        console.log("Found JWT token in localStorage, validating...")
        // Try to validate the token
        const response = await fetch(`${BACKEND_URL}/api/auth/profile/`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        })

        if (response.ok) {
          const userData = await response.json()
          console.log("JWT token validation successful:", userData)
          setUser(userData)
          return userData
        } else {
          console.log("JWT token validation failed, removing token")
          localStorage.removeItem("auth_token")
        }
      }

      // Fall back to cookie-based auth check
      console.log("Trying direct backend URL:", `${BACKEND_URL}/api/auth/profile/`)
      const response = await fetch(`${BACKEND_URL}/api/auth/profile/`, {
        credentials: "include",
      })

      if (response.ok) {
        const userData = await response.json()
        console.log("Auth check successful:", userData)
        setUser(userData)
        return userData
      } else {
        console.log("Auth check failed with status:", response.status)
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

  const setUserAndToken = (userData: User, token: string) => {
    console.log("Setting user and token:", userData)
    localStorage.setItem("auth_token", token)
    setUser(userData)
  }

  const loginWithToken = async (token: string) => {
    console.log("Login with token called")

    try {
      setIsLoading(true)

      const response = await fetch(`${BACKEND_URL}/api/auth/profile/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      })

      if (response.ok) {
        const userData = await response.json()
        console.log("Token login successful:", userData)

        localStorage.setItem("auth_token", token)
        setUser(userData)

        return { success: true }
      } else {
        console.log("Token login failed with status:", response.status)
        return {
          success: false,
          error: "Invalid or expired token",
        }
      }
    } catch (error) {
      console.error("Token login error:", error)
      return {
        success: false,
        error: "An unexpected error occurred during token login",
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Login function - direct calls only
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

      // Direct backend call only - no fallback
      const apiUrl = `${BACKEND_URL}/api/auth/login/`
      console.log("Logging in to:", apiUrl)

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      })

      console.log("Login response status:", response.status)
      console.log("Cookies after login attempt:", document.cookie)

      if (response.ok) {
        const text = await response.text()
        const data = safeJsonParse(text)
        if (data) {
          setUser(data.user)

          if (data.token) {
            localStorage.setItem("auth_token", data.token)
          }

          return { success: true }
        } else {
          return { success: false, error: "Failed to parse user data." }
        }
      } else {
        const errorText = await response.text()
        const errorData = safeJsonParse(errorText) || { error: "Invalid response from server" }
        return {
          success: false,
          error: errorData.error || "Login failed. Please try again.",
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

  // Logout function - direct calls only
  const logout = async () => {
    try {
      console.log("Logging out user...")
      console.log("Cookies before logout:", document.cookie)

      localStorage.removeItem("auth_token")

      // Direct backend call only - no fallback
      console.log("Logging out via direct backend URL")
      const response = await fetch(`${BACKEND_URL}/api/auth/logout/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      })

      console.log("Logout response status:", response.status)

      // Manually clear cookies
      console.log("Manually clearing cookies...")
      const cookies = document.cookie.split(";")

      cookies.forEach((cookie) => {
        const [name] = cookie.trim().split("=")
        if (name) {
          const trimmedName = name.trim()
          document.cookie = `${trimmedName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`
          document.cookie = `${trimmedName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT;`
          document.cookie = `${trimmedName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/api;`
          console.log(`Cleared cookie: ${trimmedName}`)
        }
      })

      console.log("Cookies after clearing:", document.cookie)

      // Clear user state
      setUser(null)

      // Redirect after a short delay
      console.log("Preparing to redirect...")
      setTimeout(() => {
        console.log("Redirecting to home page...")
        window.location.replace("/")
      }, 100)

      return true
    } catch (error) {
      console.error("Logout error:", error)
      setUser(null)

      // Force reload as fallback
      setTimeout(() => {
        window.location.replace("/")
      }, 100)
    }
  }

  // Initialize auth on component mount
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
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        checkAuth,
        isBackendAvailable,
        checkSession,
        setUserAndToken,
        loginWithToken,
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
