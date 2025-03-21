type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

interface FetchOptions extends Omit<RequestInit, 'body'> {
  data?: any;
  params?: Record<string, string>;
  withCredentials?: boolean;
}

interface ApiResponse<T = any> {
  data: T;
  status: number;
  headers: Headers;
  error?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Enhanced fetch client with better error handling and convenience features
 */
export const apiClient = {
  async request<T = any>(
    endpoint: string,
    method: RequestMethod = 'GET',
    options: FetchOptions = {}
  ): Promise<ApiResponse<T>> {
    try {
      // Build URL with query parameters
      const url = new URL(endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`);
      
      if (options.params) {
        Object.entries(options.params).forEach(([key, value]) => {
          url.searchParams.append(key, value);
        });
      }

      // Prepare headers
      const headers = new Headers(options.headers);
      if (!headers.has('Content-Type') && options.data && !(options.data instanceof FormData)) {
        headers.append('Content-Type', 'application/json');
      }

      // Prepare fetch options
      const fetchOptions: RequestInit = {
        method,
        headers,
        ...options,
        // Always include credentials if withCredentials is true or undefined
        credentials: options.withCredentials !== false ? 'include' : 'same-origin',
      };

      // Add body if it exists
      if (options.data) {
        fetchOptions.body = options.data instanceof FormData 
          ? options.data 
          : JSON.stringify(options.data);
      }

      // Execute request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      fetchOptions.signal = controller.signal;

      const response = await fetch(url.toString(), fetchOptions);
      clearTimeout(timeoutId);

      // Parse response
      let data: T;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text() as unknown as T;
      }

      // Handle error responses
      if (!response.ok) {
        return {
          data,
          status: response.status,
          headers: response.headers,
          error: typeof data === 'object' && data !== null && 'error' in data 
            ? (data as any).error 
            : `Request failed with status ${response.status}`
        };
      }

      return { data, status: response.status, headers: response.headers };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  },

  // Convenience methods
  async get<T = any>(endpoint: string, options?: FetchOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, 'GET', options);
  },

  async post<T = any>(endpoint: string, data?: any, options?: FetchOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, 'POST', { ...options, data });
  },

  async put<T = any>(endpoint: string, data?: any, options?: FetchOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, 'PUT', { ...options, data });
  },

  async delete<T = any>(endpoint: string, options?: FetchOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, 'DELETE', options);
  },

  async patch<T = any>(endpoint: string, data?: any, options?: FetchOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, 'PATCH', { ...options, data });
  }
};