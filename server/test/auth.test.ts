import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import type { AddressInfo } from 'node:net'
import { after, before, test } from 'node:test'
import mongoose from 'mongoose'
import { app } from '../src/app.js'
import { connectToDatabase } from '../src/config/database.js'
import { config } from '../src/config/env.js'
import {
  authCookieOptions,
  getAuthCookieBaseOptions,
} from '../src/middleware/auth.js'
import { UserModel } from '../src/models/user.model.js'

const email = `auth-test-${randomUUID()}@example.test`
const password = 'Test-only-password-123!'
let baseUrl: string
let server: ReturnType<typeof app.listen> | undefined

before(async () => {
  await connectToDatabase()
  await UserModel.init()
  server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address() as AddressInfo
  baseUrl = `http://127.0.0.1:${address.port}`
})

after(async () => {
  await UserModel.deleteOne({ email })
  if (server) {
    const closed = once(server, 'close')
    server.close()
    await closed
  }
  await mongoose.disconnect()
})

test('auth endpoints validate credentials, protect /me, and revoke logout tokens', async () => {
  const health = await fetch(`${baseUrl}/api/health`)
  assert.equal(health.status, 200)
  assert.deepEqual(await health.json(), { status: 'ok', database: 'connected' })

  const unauthenticated = await fetch(`${baseUrl}/api/auth/me`)
  assert.equal(unauthenticated.status, 401)

  const malformedJson = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{"email":',
  })
  assert.equal(malformedJson.status, 400)

  const invalidInput = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'not-an-email', password: 'short' }),
  })
  assert.equal(invalidInput.status, 400)

  const invalidUsername = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, username: 42 }),
  })
  assert.equal(invalidUsername.status, 400)

  const signup = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: ` ${email.toUpperCase()} `, password, username: 'Tester' }),
  })
  assert.equal(signup.status, 201)
  const signupBody = (await signup.json()) as {
    user: { id: string; email: string; username: string; passwordHash?: string }
  }
  assert.equal(signupBody.user.email, email)
  assert.equal(signupBody.user.username, 'Tester')
  assert.equal('passwordHash' in signupBody.user, false)
  const signupCookie = signup.headers.get('set-cookie') ?? ''
  assert.equal(/HttpOnly/i.test(signupCookie), true)
  assert.equal(
    new RegExp(`SameSite=${config.nodeEnv === 'production' ? 'None' : 'Lax'}`, 'i').test(signupCookie),
    true,
  )
  assert.equal(new RegExp(`Secure`, 'i').test(signupCookie), config.nodeEnv === 'production')
  assert.equal(/Path=\/api/i.test(signupCookie), true)
  const signupCookiePair = signupCookie.split(';', 1)[0]
  assert.equal(signupCookiePair.startsWith('prepcore_token='), true)

  const signedUpMe = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { cookie: signupCookiePair },
  })
  assert.equal(signedUpMe.status, 200)

  const storedUser = await UserModel.findById(signupBody.user.id).select('+passwordHash')
  assert.equal(typeof storedUser?.passwordHash === 'string' && storedUser.passwordHash.startsWith('$2'), true)
  assert.equal(storedUser?.passwordHash === password, false)

  const duplicate = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  assert.equal(duplicate.status, 409)

  const wrongPassword = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'Wrong-password-123!' }),
  })
  assert.equal(wrongPassword.status, 401)

  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: email.toUpperCase(), password }),
  })
  assert.equal(login.status, 200)
  const loginCookie = (login.headers.get('set-cookie') ?? '').split(';', 1)[0]
  assert.equal(loginCookie.startsWith('prepcore_token='), true)

  const me = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { cookie: loginCookie },
  })
  assert.equal(me.status, 200)
  const meBody = (await me.json()) as { user: { id: string; email: string; passwordHash?: string } }
  assert.equal(meBody.user.id, signupBody.user.id)
  assert.equal(meBody.user.email, email)
  assert.equal('passwordHash' in meBody.user, false)

  const logout = await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: { cookie: loginCookie },
  })
  assert.equal(logout.status, 204)
  const clearedCookie = logout.headers.get('set-cookie') ?? ''
  assert.equal(clearedCookie.startsWith('prepcore_token=;'), true)
  assert.equal(/Expires=Thu, 01 Jan 1970/i.test(clearedCookie), true)

  const loggedOut = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { cookie: loginCookie },
  })
  assert.equal(loggedOut.status, 401)
})

test('auth cookie options retain secure attributes for production and local development', () => {
  assert.deepEqual(getAuthCookieBaseOptions('production'), {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/api',
  })
  assert.deepEqual(getAuthCookieBaseOptions('development'), {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/api',
  })
  assert.equal(authCookieOptions.maxAge, config.authTokenTtlSeconds * 1000)
})
