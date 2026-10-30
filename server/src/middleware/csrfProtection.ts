import type { RequestHandler } from 'express'
import { HttpError } from './httpError.js'

const stateChangingMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export function createCsrfProtection(
  allowedOrigins: readonly string[],
  requireOrigin: boolean,
): RequestHandler {
  return (request, _response, next) => {
    if (!stateChangingMethods.has(request.method)) {
      next()
      return
    }

    const origin = request.get('origin')
    if (!origin) {
      if (requireOrigin) {
        next(new HttpError(403, 'Origin is required for state-changing requests'))
        return
      }
      next()
      return
    }

    if (!allowedOrigins.includes(origin)) {
      next(new HttpError(403, 'Origin is not allowed'))
      return
    }

    next()
  }
}
