import type { RequestHandler } from 'express'
import { HttpError } from './httpError.js'

const requestLimit = 10
const windowMilliseconds = 60_000
const userWindows = new Map<string, { count: number; resetAt: number }>()

export const aiRateLimit: RequestHandler = (request, response, next) => {
  const userId = request.authUserId
  if (!userId) {
    next(new HttpError(401, 'Authentication required'))
    return
  }

  const now = Date.now()
  for (const [id, window] of userWindows) {
    if (window.resetAt <= now) {
      userWindows.delete(id)
    }
  }

  let window = userWindows.get(userId)
  if (!window || window.resetAt <= now) {
    window = { count: 0, resetAt: now + windowMilliseconds }
    userWindows.set(userId, window)
  }

  if (window.count >= requestLimit) {
    response.setHeader('Retry-After', String(Math.ceil((window.resetAt - now) / 1000)))
    next(new HttpError(429, 'AI question limit reached. Please try again later.'))
    return
  }

  window.count += 1
  next()
}
