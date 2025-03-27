/**
 * Utility functions for handling CSRF tokens in fetch requests
 */

// Helper function to get a cookie value by name
export function getCookie(name: string): string | undefined {
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) {
      return parts.pop()?.split(";").shift()
    }
    return undefined
  }
  
  // Fetch with CSRF token included
  export async function fetchWithCsrf(url: string, options: RequestInit = {}): Promise<Response> {
    // First, ensure we have a CSRF token
    let csrfToken = getCookie("csrftoken")
  
    // If no CSRF token exists, make a GET request to get one
    if (!csrfToken) {
      try {
        await fetch("http://localhost:8000/api/auth/profile/", {
          method: "GET",
          credentials: "include",
        })
        csrfToken = getCookie("csrftoken")
      } catch (error) {
        console.error("Error fetching CSRF token:", error)
      }
    }
  
    // Prepare headers with CSRF token
    const headers = new Headers(options.headers || {})
    headers.set("Content-Type", "application/json")
    headers.set("X-CSRFToken", csrfToken || "")
    headers.set("X-Requested-With", "XMLHttpRequest")
  
    // Return fetch with CSRF token included
    return fetch(url, {
      ...options,
      credentials: "include",
      headers,
    })
  }
  
  