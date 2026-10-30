import assert from 'node:assert/strict'
import { once } from 'node:events'
import express from 'express'
import type { AddressInfo } from 'node:net'
import { after, before, test } from 'node:test'

process.env.GROQ_API_KEY = 'test-only-groq-key'

const [{ app }, { createAiRouter }, { errorHandler }, { config }] = await Promise.all([
  import('../src/app.js'),
  import('../src/routes/aiRoutes.js'),
  import('../src/middleware/errorHandler.js'),
  import('../src/config/env.js'),
])

const originalFetch = globalThis.fetch
let authenticatedBaseUrl: string
let protectedBaseUrl: string
let authenticatedServer: ReturnType<express.Application['listen']> | undefined
let protectedServer: ReturnType<express.Application['listen']> | undefined
let providerMode: 'success' | 'invalid-json' | 'error' | 'timeout' = 'success'
let providerCalls = 0

const mockedFetch: typeof fetch = async (input, init) => {
  if (String(input) !== 'https://api.groq.com/openai/v1/chat/completions') {
    return originalFetch(input, init)
  }

  providerCalls += 1
  assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer test-only-groq-key')
  const providerRequest = JSON.parse(String(init?.body)) as {
    model: string
    messages: Array<{ role: string; content: string }>
    temperature: number
    max_completion_tokens: number
  }
  assert.equal(providerRequest.model, 'openai/gpt-oss-20b')
  assert.equal(providerRequest.messages[0]?.role, 'system')
  assert.match(providerRequest.messages[0]?.content ?? '', /helpful study assistant/)
  assert.equal(providerRequest.temperature, 0.7)
  assert.equal(providerRequest.max_completion_tokens, 300)
  if (providerMode === 'timeout') {
    throw new DOMException('private provider details', 'TimeoutError')
  }
  if (providerMode === 'error') {
    return new Response(JSON.stringify({
      error: { message: 'invalid api_key=gsk_test-secret-123 from provider' },
    }), { status: 429 })
  }
  if (providerMode === 'invalid-json') {
    return new Response('{not json', { status: 200 })
  }
  return new Response(JSON.stringify({
    choices: [{ message: { content: 'A concise study answer.' } }],
  }), { status: 200 })
}

function createTestApp() {
  const testApp = express()
  testApp.use(express.json())
  testApp.use('/api/ai', createAiRouter((_request, _response, next) => {
    _request.authUserId = 'integration-test-user'
    next()
  }))
  testApp.use(errorHandler)
  return testApp
}

async function listen(application: express.Application): Promise<{
  server: ReturnType<express.Application['listen']>
  baseUrl: string
}> {
  const server = application.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address() as AddressInfo
  return { server, baseUrl: `http://127.0.0.1:${address.port}` }
}

async function request(
  baseUrl: string,
  body: unknown,
  includeCookie = true,
): Promise<Response> {
  return fetch(`${baseUrl}/api/ai/ask`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(includeCookie ? { cookie: `prepcore_token=${'invalid-for-test'}` } : {}),
    },
    body: JSON.stringify(body),
  })
}

before(async () => {
  const authenticated = await listen(createTestApp())
  authenticatedServer = authenticated.server
  authenticatedBaseUrl = authenticated.baseUrl
  const protectedApp = await listen(app)
  protectedServer = protectedApp.server
  protectedBaseUrl = protectedApp.baseUrl
  globalThis.fetch = mockedFetch
})

after(async () => {
  globalThis.fetch = originalFetch
  for (const server of [authenticatedServer, protectedServer]) {
    if (server) {
      const closed = once(server, 'close')
      server.close()
      await closed
    }
  }
})

test('AI endpoint authenticates, validates, hides provider failures, and rate-limits per user', async () => {
  assert.equal(config.groqApiKey, 'test-only-groq-key')

  const unauthorized = await request(protectedBaseUrl, { question: 'Explain photosynthesis.' }, false)
  assert.equal(unauthorized.status, 401)
  assert.equal(providerCalls, 0)

  for (const body of [
    {},
    { question: '   ' },
    { question: 'x'.repeat(2001) },
    { question: 'Explain this.', user_id: 'forged-user-id' },
  ]) {
    const invalid = await request(authenticatedBaseUrl, body)
    assert.equal(invalid.status, 400)
    assert.equal(providerCalls, 0)
  }

  config.groqApiKey = undefined
  const unconfigured = await request(authenticatedBaseUrl, { question: 'Question?' })
  assert.equal(unconfigured.status, 503)
  assert.equal((await unconfigured.text()).includes('test-only-groq-key'), false)
  config.groqApiKey = 'test-only-groq-key'

  const success = await request(authenticatedBaseUrl, { question: '  Explain photosynthesis.  ' })
  assert.equal(success.status, 200)
  assert.deepEqual(await success.json(), { answer: 'A concise study answer.' })
  assert.equal(providerCalls, 1)

  providerMode = 'invalid-json'
  const invalidProviderResponse = await request(authenticatedBaseUrl, { question: 'Question?' })
  assert.equal(invalidProviderResponse.status, 502)
  const invalidBody = await invalidProviderResponse.text()
  assert.equal(invalidBody.includes('private'), false)
  assert.equal(invalidBody.includes('test-only-groq-key'), false)

  providerMode = 'error'
  const providerLogs: string[] = []
  const originalConsoleError = console.error
  console.error = (...args: unknown[]) => providerLogs.push(args.join(' '))
  const providerError = await request(authenticatedBaseUrl, { question: 'Question?' })
  console.error = originalConsoleError
  assert.equal(providerError.status, 502)
  const providerErrorBody = await providerError.text()
  assert.equal(providerErrorBody.includes('private'), false)
  assert.equal(providerErrorBody.includes('test-only-groq-key'), false)
  assert.match(providerLogs.join(' '), /HTTP 429/)
  assert.match(providerLogs.join(' '), /invalid api_key=\[REDACTED\]/)
  assert.equal(providerLogs.join(' ').includes('gsk_test-secret-123'), false)

  providerMode = 'timeout'
  const timeout = await request(authenticatedBaseUrl, { question: 'Question?' })
  assert.equal(timeout.status, 504)
  const timeoutBody = await timeout.text()
  assert.equal(timeoutBody.includes('private'), false)
  assert.equal(timeoutBody.includes('test-only-groq-key'), false)

  providerMode = 'success'
  for (let index = 0; index < 5; index += 1) {
    const allowed = await request(authenticatedBaseUrl, { question: `Question ${index}?` })
    assert.equal(allowed.status, 200)
  }

  const limited = await request(authenticatedBaseUrl, { question: 'One too many?' })
  assert.equal(limited.status, 429)
  assert.equal(limited.headers.get('retry-after') !== null, true)
  assert.equal(providerCalls, 9)
})
