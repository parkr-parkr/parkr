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

  // Create a new options object to avoid modifying the original
  const fetchOptions: RequestInit = {
    ...options,
    credentials: "include",
  }

  // Create headers object
  const headers = new Headers()

  // Add CSRF token and XHR indicator to all requests
  headers.set("X-CSRFToken", csrfToken || "")
  headers.set("X-Requested-With", "XMLHttpRequest")

  // Check if we're sending FormData
  const isFormData = options.body instanceof FormData
  console.log(isFormData)
  // Only set Content-Type for non-FormData requests
  // For FormData, let the browser set the Content-Type and boundary
  if (!isFormData) {
    headers.set("Content-Type", "application/json")
  }

  // Merge with any existing headers
  if (options.headers) {
    const existingHeaders = new Headers(options.headers)
    existingHeaders.forEach((value, key) => {
      // Skip Content-Type for FormData
      if (isFormData && key.toLowerCase() === "content-type") {
        return
      }
      headers.set(key, value)
    })
  }

  // Set the headers on the fetch options
  fetchOptions.headers = headers

  // Log the request for debugging
  console.log(`Sending ${fetchOptions.method || "GET"} request to ${url}`, {
    isFormData,
    headers: Array.from(headers.entries()),
  })

  // Make the request
  return fetch(url, fetchOptions)
}

