import assert from 'node:assert/strict'
import { once } from 'node:events'
import express from 'express'
import type { AddressInfo } from 'node:net'
import { after, before, test } from 'node:test'
import { createCsrfProtection } from '../src/middleware/csrfProtection.js'

const trustedOrigin = 'https://prepcore.example'
const protectionApp = express()
protectionApp.use(createCsrfProtection([trustedOrigin], true))
protectionApp.post('/write', (_request, response) => response.sendStatus(204))
protectionApp.put('/write', (_request, response) => response.sendStatus(204))
protectionApp.patch('/write', (_request, response) => response.sendStatus(204))
protectionApp.delete('/write', (_request, response) => response.sendStatus(204))
protectionApp.get('/read', (_request, response) => response.sendStatus(204))
protectionApp.head('/read', (_request, response) => response.sendStatus(204))
protectionApp.options('/write', (_request, response) => response.sendStatus(204))

const localProtectionApp = express()
localProtectionApp.use(createCsrfProtection([trustedOrigin], false))
localProtectionApp.post('/write', (_request, response) => response.sendStatus(204))

let server: ReturnType<typeof protectionApp.listen> | undefined
let localServer: ReturnType<typeof localProtectionApp.listen> | undefined
let baseUrl: string
let localBaseUrl: string

before(async () => {
  server = protectionApp.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address() as AddressInfo
  baseUrl = `http://127.0.0.1:${address.port}`

  localServer = localProtectionApp.listen(0, '127.0.0.1')
  await once(localServer, 'listening')
  const localAddress = localServer.address() as AddressInfo
  localBaseUrl = `http://127.0.0.1:${localAddress.port}`
})

after(async () => {
  if (server) {
    const closed = once(server, 'close')
    server.close()
    await closed
  }
  if (localServer) {
    const closed = once(localServer, 'close')
    localServer.close()
    await closed
  }
})

test('CSRF protection permits trusted origins and rejects untrusted or missing origins', async () => {
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    const trusted = await fetch(`${baseUrl}/write`, {
      method,
      headers: { origin: trustedOrigin },
    })
    assert.equal(trusted.status, 204, `${method} should accept a trusted origin`)

    const untrusted = await fetch(`${baseUrl}/write`, {
      method,
      headers: { origin: 'https://untrusted.example' },
    })
    assert.equal(untrusted.status, 403, `${method} should reject an untrusted origin`)

    const missing = await fetch(`${baseUrl}/write`, { method })
    assert.equal(missing.status, 403, `${method} should require an Origin header`)
  }
})

test('CSRF protection does not block safe methods or OPTIONS preflight', async () => {
  for (const method of ['GET', 'HEAD', 'OPTIONS']) {
    const response = await fetch(`${baseUrl}/${method === 'OPTIONS' ? 'write' : 'read'}`, {
      method,
    })
    assert.equal(response.status, 204, `${method} should pass through CSRF protection`)
  }
})

test('local development permits state-changing requests without an Origin header', async () => {
  const response = await fetch(`${localBaseUrl}/write`, { method: 'POST' })
  assert.equal(response.status, 204)
})
