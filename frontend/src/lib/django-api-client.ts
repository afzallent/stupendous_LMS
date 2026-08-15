const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

/** Thrown when a request fails; carries the HTTP status for callers that care. */
export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const TOKEN_KEY = 'token'
const ACCESS_TOKEN_KEY = 'access_token'
const REFRESH_TOKEN_KEY = 'refresh_token'

/** Endpoints that must never trigger a refresh-and-retry cycle. */
const AUTH_ENDPOINTS = ['/api/auth/login/', '/api/auth/signup/', '/api/auth/token/refresh/']

class DjangoApiClient {
  private baseURL: string

  /**
   * In-flight refresh, shared by every caller.
   *
   * Access tokens expire after 15 minutes. Without this, a page that fires
   * several requests at once would kick off several concurrent refreshes; with
   * ROTATE_REFRESH_TOKENS enabled on the server, the first one invalidates the
   * refresh token the others are still using and the user is logged out.
   */
  private refreshPromise: Promise<string | null> | null = null

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  private getAccessToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(TOKEN_KEY) ?? localStorage.getItem(ACCESS_TOKEN_KEY)
  }

  private setAccessToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(ACCESS_TOKEN_KEY, token)
  }

  private clearSession() {
    if (typeof window === 'undefined') return
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem('user')
    // Let the auth context redirect; the client itself stays route-agnostic.
    window.dispatchEvent(new CustomEvent('auth:session-expired'))
  }

  /**
   * Exchange the stored refresh token for a new access token.
   * Returns the new access token, or null if the session cannot be recovered.
   */
  private async refreshAccessToken(): Promise<string | null> {
    if (typeof window === 'undefined') return null

    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
    if (!refreshToken) {
      this.clearSession()
      return null
    }

    try {
      const response = await fetch(`${this.baseURL}/api/auth/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken }),
      })

      if (!response.ok) {
        this.clearSession()
        return null
      }

      const data = await response.json()
      if (!data.access) {
        this.clearSession()
        return null
      }

      this.setAccessToken(data.access)
      // The server rotates refresh tokens, so store the replacement when sent.
      if (data.refresh) {
        localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh)
      }
      return data.access
    } catch {
      this.clearSession()
      return null
    }
  }

  /** Coalesce concurrent refreshes into a single request. */
  private async getRefreshedToken(): Promise<string | null> {
    if (!this.refreshPromise) {
      this.refreshPromise = this.refreshAccessToken().finally(() => {
        this.refreshPromise = null
      })
    }
    return this.refreshPromise
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    params?: Record<string, any>
  ): Promise<T> {
    let url = `${this.baseURL}${endpoint}`
    
    // Add query parameters if provided
    if (params) {
      const searchParams = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value))
        }
      })
      const queryString = searchParams.toString()
      if (queryString) {
        url += `?${queryString}`
      }
    }

    const send = (token: string | null) => {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      return fetch(url, { ...options, headers })
    }

    let response = await send(this.getAccessToken())

    // Access tokens live 15 minutes. On expiry, refresh once and replay the
    // request. Without this the user was hard-logged-out every 15 minutes.
    const isAuthEndpoint = AUTH_ENDPOINTS.some((path) => endpoint.startsWith(path))
    if (response.status === 401 && !isAuthEndpoint) {
      const newToken = await this.getRefreshedToken()
      if (newToken) {
        response = await send(newToken)
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }))
      if (response.status === 401 && !isAuthEndpoint) {
        this.clearSession()
      }
      throw new ApiError(error.detail || `HTTP ${response.status}`, response.status)
    }

    // 204 No Content has no body to parse.
    if (response.status === 204) {
      return undefined as T
    }

    return response.json()
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' }, params)
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async put<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async patch<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }

  async upload<T>(endpoint: string, formData: FormData): Promise<T> {
    const url = `${this.baseURL}${endpoint}`

    const send = (token: string | null) => {
      const headers: HeadersInit = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      // Content-Type is deliberately unset so the browser adds the multipart
      // boundary itself.
      return fetch(url, { method: 'POST', headers, body: formData })
    }

    let response = await send(this.getAccessToken())

    if (response.status === 401) {
      const newToken = await this.getRefreshedToken()
      if (newToken) {
        response = await send(newToken)
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Upload failed' }))
      if (response.status === 401) {
        this.clearSession()
      }
      throw new ApiError(error.detail || `HTTP ${response.status}`, response.status)
    }

    return response.json()
  }
}

export const djangoApi = new DjangoApiClient(API_BASE_URL)
