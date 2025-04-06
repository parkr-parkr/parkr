import { fetchWithCsrf } from "./csrf"

// Define the backend URL with a fallback
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

/**
 * Django-specific API client with built-in error handling and CSRF protection
 */
export class ApiClient {
  /**
   * Make a GET request
   */
  static async get<T>(endpoint: string): Promise<T> {
    const url = `${BACKEND_URL}${endpoint}`
    const response = await fetchWithCsrf(url)

    if (!response.ok) {
      await this.handleErrorResponse(response)
    }

    return response.json()
  }

  /**
   * Make a POST request with JSON data
   */
  static async post<T>(endpoint: string, data?: any): Promise<T> {
    const url = `${BACKEND_URL}${endpoint}`

    try {
      const response = await fetchWithCsrf(url, {
        method: "POST",
        body: data ? JSON.stringify(data) : undefined,
      })

      if (!response.ok) {
        await this.handleErrorResponse(response)
      }

      return response.json()
    } catch (error) {
      console.error("POST request failed:", error)
      throw error
    }
  }

  /**
   * Make a POST request with FormData (for file uploads)
   */
  static async postFormData<T>(endpoint: string, formData: FormData): Promise<T> {
    const url = `${BACKEND_URL}${endpoint}`

    console.log("Posting form data to:", url)
    console.log(
      "Form data entries:",
      Array.from(formData.entries()).map(([key, value]) => {
        if (value instanceof File) {
          return [key, `File: ${value.name} (${value.type}, ${value.size} bytes)`]
        }
        return [key, value]
      }),
    )

    try {
      // Use direct fetch without any custom headers for FormData
      const response = await fetch(url, {
        method: "POST",
        body: formData,
        credentials: "include",
      })

      if (!response.ok) {
        await this.handleErrorResponse(response)
      }

      return response.json()
    } catch (error) {
      console.error("FormData POST request failed:", error)
      throw error
    }
  }

  /**
   * List a driveway
*/
static async listDriveway(data: {
    name: string
    address: string
    latitude: string
    longitude: string
    price_per_hour: string | number
    description: string
    photos?: File[]
  }): Promise<any> {
    const formData = new FormData()

    console.log(data)

    // Add text fields
    formData.append("name", data.name)
    formData.append("address", data.address)
    formData.append("price_per_hour", String(data.price_per_hour))
    formData.append("description", data.description)

    formData.append("longitude", data.longitude)
    formData.append("latitude", data.latitude)
    // Removed is_active field

    // Add photos if provided
    if (data.photos && data.photos.length > 0) {
      // Add photo count first
      formData.append("photo_count", String(data.photos.length))

      // Then add each photo
      data.photos.forEach((photo, index) => {
        formData.append(`photo_${index + 1}`, photo)
      })
    } else {
      // Explicitly set photo count to 0 if no photos
      formData.append("photo_count", "0")
    }

    try {
      console.log("Submitting driveway listing")

      // Get CSRF token directly from cookies
      const getCsrfToken = (): string => {
        const value = `; ${document.cookie}`
        const parts = value.split(`; csrftoken=`)
        if (parts.length === 2) return parts.pop()?.split(";").shift() || ""
        return ""
      }

      const csrfToken = getCsrfToken()

      console.log(formData)

      // Use direct fetch with minimal headers
      const url = `${BACKEND_URL}/api/places/list-driveway/`
      const response = await fetch(url, {
        method: "POST",
        body: formData,
        credentials: "include",
        headers: {
          "X-CSRFToken": csrfToken,
        },
      })

      if (!response.ok) {
        await this.handleErrorResponse(response)
      }

      return response.json()
    } catch (error) {
      console.error("Error in listDriveway:", error)
      throw error
    }
  }

  /**
   * Handle error responses with detailed logging
   */
  private static async handleErrorResponse(response: Response): Promise<never> {
    console.error(`API Error: ${response.status} ${response.statusText}`)

    let errorMessage = `Server returned ${response.status}`

    try {
      // Try to parse as JSON first
      const contentType = response.headers.get("content-type")
      if (contentType && contentType.includes("application/json")) {
        const errorData = await response.json()
        console.error("Error data:", errorData)

        // Extract error message from various Django formats
        errorMessage =
          errorData.detail ||
          errorData.error ||
          (errorData.non_field_errors ? errorData.non_field_errors[0] : null) ||
          JSON.stringify(errorData)
      } else {
        // Otherwise get as text
        const errorText = await response.text()
        console.error("Error text:", errorText)
        errorMessage = errorText || errorMessage
      }
    } catch (e) {
      console.error("Could not parse error response:", e)
    }

    throw new Error(errorMessage)
  }
}

