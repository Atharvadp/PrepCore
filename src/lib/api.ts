const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL?.trim() || 'http://localhost:3000')
  .replace(/\/+$/, '')

export class ApiError extends Error {
  public readonly status: number

  constructor(
    message: string,
    status: number,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getResponseMessage(body: unknown): string | undefined {
  if (!isRecord(body)) {
    return undefined
  }
  if (typeof body.error === 'string') {
    if (
      isRecord(body.details) &&
      Array.isArray(body.details.errors) &&
      typeof body.details.errors[0] === 'string'
    ) {
      return body.details.errors[0]
    }
    return body.error
  }
  return undefined
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${apiBaseUrl}/api${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        ...(init?.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...init?.headers,
      },
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error
    }
    throw new ApiError('Unable to reach the server. Please try again.', 0)
  }

  let body: unknown
  if (response.status !== 204) {
    try {
      body = await response.json()
    } catch {
      body = undefined
    }
  }

  if (!response.ok) {
    const message = getResponseMessage(body)
    throw new ApiError(
      message ?? (response.status >= 500
        ? 'The server could not complete the request. Please try again.'
        : 'The request could not be completed.'),
      response.status,
    )
  }

  return body as T
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback
}
