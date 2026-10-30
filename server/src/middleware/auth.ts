import type { RequestHandler } from 'express'
import jwt, { type JwtPayload } from 'jsonwebtoken'
import { config } from '../config/env.js'
import { UserModel } from '../models/user.model.js'
import { HttpError } from './httpError.js'

export const authCookieName = 'prepcore_token'

export const requireAuthentication: RequestHandler = async (request, response, next) => {
  const token: unknown = request.cookies?.[authCookieName]
  if (typeof token !== 'string' || token.length === 0) {
    next(new HttpError(401, 'Authentication required'))
    return
  }

  let userId: string
  let tokenVersion: number
  try {
    const verified = jwt.verify(token, config.authTokenSecret, {
      algorithms: ['HS256'],
    })
    const payload: JwtPayload | undefined =
      typeof verified === 'object' && verified !== null ? verified : undefined
    if (
      typeof payload?.sub !== 'string' ||
      payload.sub.length === 0 ||
      typeof payload.ver !== 'number' ||
      !Number.isInteger(payload.ver) ||
      payload.ver < 0
    ) {
      throw new Error('Invalid authentication token')
    }

    userId = payload.sub
    tokenVersion = payload.ver
  } catch {
    response.clearCookie(authCookieName, authCookieBaseOptions)
    next(new HttpError(401, 'Authentication required'))
    return
  }

  const user = await UserModel.findById(userId).select('+authVersion')
  if (!user || user.authVersion !== tokenVersion) {
    response.clearCookie(authCookieName, authCookieBaseOptions)
    next(new HttpError(401, 'Authentication required'))
    return
  }
  request.authUserId = userId
  next()
}

export const authCookieBaseOptions = {
  httpOnly: true,
  secure: config.nodeEnv === 'production',
  sameSite: 'lax' as const,
  path: '/api',
}

export const authCookieOptions = {
  ...authCookieBaseOptions,
  maxAge: config.authTokenTtlSeconds * 1000,
}
