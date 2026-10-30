import { useEffect, useRef, useState } from 'react'
import { AuthContext, type AuthContextValue, type AuthError } from './auth-context'
import type { AuthUser } from './authTypes'

export type { AuthUser } from './authTypes'

interface AuthApiResponse {
  user?: unknown
  error?: unknown
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL?.trim() || 'http://localhost:3000')
  .replace(/\/+$/, '')
const authApiUrl = `${apiBaseUrl}/api/auth`

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseUser(value: unknown): AuthUser | null {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.email !== 'string' ||
    (value.username !== undefined && typeof value.username !== 'string')
  ) {
    return null
  }

  return {
    id: value.id,
    email: value.email,
    ...(typeof value.username === 'string' ? { username: value.username } : {}),
  }
}

async function requestAuth(
  path: string,
  init?: RequestInit,
): Promise<{ response: Response; body: AuthApiResponse | null } | { error: AuthError }> {
  try {
    const response = await fetch(`${authApiUrl}${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        ...(init?.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...init?.headers,
      },
    })
    let body: AuthApiResponse | null = null
    if (response.status !== 204) {
      try {
        const parsed: unknown = await response.json()
        body = isRecord(parsed) ? parsed : null
      } catch {
        body = null
      }
    }
    return { response, body }
  } catch {
    return { error: { message: 'Unable to reach the authentication service. Please try again.' } }
  }
}

function responseError(body: AuthApiResponse | null, fallback: string): AuthError {
  return {
    message: typeof body?.error === 'string' ? body.error : fallback,
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const authOperation = useRef(0)

  useEffect(() => {
    const controller = new AbortController()

    void requestAuth('/me', { signal: controller.signal }).then((result) => {
      if (controller.signal.aborted) {
        return
      }

      if (authOperation.current === 0) {
        if ('response' in result && result.response.ok) {
          setUser(parseUser(result.body?.user))
        } else {
          setUser(null)
        }
      }
      setLoading(false)
    })

    return () => controller.abort()
  }, [])

  const signUp: AuthContextValue['signUp'] = async (email, password) => {
    authOperation.current += 1
    const result = await requestAuth('/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    if ('error' in result) {
      return { error: result.error }
    }
    if (!result.response.ok) {
      return { error: responseError(result.body, 'Unable to create account. Please try again.') }
    }

    const authenticatedUser = parseUser(result.body?.user)
    if (!authenticatedUser) {
      return { error: { message: 'The authentication service returned an invalid response.' } }
    }
    setUser(authenticatedUser)
    return { error: null }
  }

  const signIn: AuthContextValue['signIn'] = async (email, password) => {
    authOperation.current += 1
    const result = await requestAuth('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    if ('error' in result) {
      return { error: result.error }
    }
    if (!result.response.ok) {
      return { error: responseError(result.body, 'Unable to sign in. Please try again.') }
    }

    const authenticatedUser = parseUser(result.body?.user)
    if (!authenticatedUser) {
      return { error: { message: 'The authentication service returned an invalid response.' } }
    }
    setUser(authenticatedUser)
    return { error: null }
  }

  const signOut: AuthContextValue['signOut'] = async () => {
    authOperation.current += 1
    const result = await requestAuth('/logout', { method: 'POST' })
    setUser(null)

    if ('error' in result) {
      return { error: result.error }
    }
    if (!result.response.ok && result.response.status !== 401) {
      return { error: responseError(result.body, 'Unable to end the server session.') }
    }
    return { error: null }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
