import bcrypt from 'bcrypt'
import type { RequestHandler } from 'express'
import jwt from 'jsonwebtoken'
import { UserModel } from '../models/user.model.js'
import { config } from '../config/env.js'
import { HttpError } from '../middleware/httpError.js'
import {
  authCookieBaseOptions,
  authCookieName,
  authCookieOptions,
} from '../middleware/auth.js'
import {
  parseLoginBody,
  parseSignupBody,
} from '../validation/authValidation.js'

const bcryptRounds = 12

function publicUser(user: { _id: string; email: string; username?: string }) {
  return {
    id: user._id,
    email: user.email,
    ...(user.username === undefined ? {} : { username: user.username }),
  }
}

function setAuthCookie(
  response: Parameters<RequestHandler>[1],
  userId: string,
  authVersion: number,
): void {
  const token = jwt.sign({ ver: authVersion }, config.authTokenSecret, {
    algorithm: 'HS256',
    subject: userId,
    expiresIn: config.authTokenTtlSeconds,
  })
  response.cookie(authCookieName, token, authCookieOptions)
}

export const signup: RequestHandler = async (request, response) => {
  const parsed = parseSignupBody(request.body)
  if (!parsed.value) {
    throw new HttpError(400, 'Request validation failed', { errors: parsed.errors })
  }

  const passwordHash = await bcrypt.hash(parsed.value.password, bcryptRounds)
  const user = await UserModel.create({
    email: parsed.value.email,
    passwordHash,
    ...(parsed.value.username === undefined ? {} : { username: parsed.value.username }),
  })

  setAuthCookie(response, user._id, user.authVersion)
  response.status(201).json({ user: publicUser(user) })
}

export const login: RequestHandler = async (request, response) => {
  const parsed = parseLoginBody(request.body)
  if (!parsed.value) {
    throw new HttpError(400, 'Request validation failed', { errors: parsed.errors })
  }

  const user = await UserModel.findOne({ email: parsed.value.email }).select(
    '+passwordHash +authVersion',
  )
  if (!user || !(await bcrypt.compare(parsed.value.password, user.passwordHash))) {
    throw new HttpError(401, 'Invalid email or password')
  }

  setAuthCookie(response, user._id, user.authVersion)
  response.status(200).json({ user: publicUser(user) })
}

export const logout: RequestHandler = async (request, response) => {
  await UserModel.updateOne(
    { _id: request.authUserId },
    { $inc: { authVersion: 1 } },
  )
  response.clearCookie(authCookieName, authCookieBaseOptions)
  response.status(204).end()
}

export const me: RequestHandler = async (request, response) => {
  const user = await UserModel.findById(request.authUserId)
  if (!user) {
    throw new HttpError(401, 'Authentication required')
  }
  response.status(200).json({ user: publicUser(user) })
}
