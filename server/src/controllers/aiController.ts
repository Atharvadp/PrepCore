import type { Request, RequestHandler } from 'express'
import { config } from '../config/env.js'
import { HttpError } from '../middleware/httpError.js'
import { parseAskQuestionBody } from '../validation/aiValidation.js'

const groqApiUrl = 'https://api.groq.com/openai/v1/chat/completions'
const groqModel = 'openai/gpt-oss-20b'
const requestTimeoutMilliseconds = 15_000
const systemPrompt =
  'You are a helpful study assistant. Provide clear, concise answers to student questions. Keep responses under 200 words and focus on explaining concepts simply.'

function getProviderErrorMessage(value: unknown): string | undefined {
  if (typeof value !== 'object' || value === null || !('error' in value)) {
    return undefined
  }

  const providerError = value.error
  if (typeof providerError === 'string') {
    return providerError
  }
  if (
    typeof providerError === 'object' &&
    providerError !== null &&
    'message' in providerError &&
    typeof providerError.message === 'string'
  ) {
    return providerError.message
  }
  return undefined
}

function sanitizeProviderError(message: string): string {
  return message
    .replace(/\bBearer\s+\S+/gi, 'Bearer [REDACTED]')
    .replace(/\bgsk_[A-Za-z0-9_-]+\b/g, '[REDACTED]')
    .replace(
      /\b(api[_ -]?key|authorization|token|secret|password)\b(\s*[=:]\s*)[^\s,;]+/gi,
      '$1$2[REDACTED]',
    )
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300)
}

function getQuestion(request: Request): string {
  const parsed = parseAskQuestionBody(request.body)
  if (!parsed.value) {
    throw new HttpError(400, 'Request validation failed', { errors: parsed.errors })
  }
  return parsed.value.question
}

function getAssistantAnswer(value: unknown): string | undefined {
  if (typeof value !== 'object' || value === null || !('choices' in value)) {
    return undefined
  }
  const choices = value.choices
  if (!Array.isArray(choices) || choices.length === 0) {
    return undefined
  }
  const choice = choices[0]
  if (typeof choice !== 'object' || choice === null || !('message' in choice)) {
    return undefined
  }
  const message = choice.message
  if (typeof message !== 'object' || message === null || !('content' in message)) {
    return undefined
  }
  return typeof message.content === 'string' && message.content.trim()
    ? message.content.trim()
    : undefined
}

export const askAiQuestion: RequestHandler = async (request, response) => {
  const question = getQuestion(request)
  const apiKey = config.groqApiKey
  if (!apiKey) {
    console.error('AI request rejected: GROQ_API_KEY is not loaded in this backend process')
    throw new HttpError(503, 'AI service is not configured')
  }

  let providerResponse: Response
  try {
    providerResponse = await fetch(groqApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: groqModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question },
        ],
        temperature: 0.7,
        max_completion_tokens: 300,
      }),
      signal: AbortSignal.timeout(requestTimeoutMilliseconds),
    })
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new HttpError(504, 'AI service timed out. Please try again.')
    }
    throw new HttpError(502, 'Unable to get an answer right now. Please try again.')
  }

  if (!providerResponse.ok) {
    let providerMessage = `Provider returned HTTP ${providerResponse.status}`
    try {
      const body: unknown = await providerResponse.json()
      const message = getProviderErrorMessage(body)
      if (message) {
        providerMessage = sanitizeProviderError(message)
      }
    } catch {
      // Keep the HTTP status diagnostic when the provider error body is not JSON.
    }
    console.error(`Groq API request failed (HTTP ${providerResponse.status}): ${providerMessage}`)
    throw new HttpError(502, 'Unable to get an answer right now. Please try again.')
  }

  let providerBody: unknown
  try {
    providerBody = await providerResponse.json()
  } catch {
    throw new HttpError(502, 'AI service returned an invalid response. Please try again.')
  }

  const answer = getAssistantAnswer(providerBody)
  if (!answer) {
    throw new HttpError(502, 'AI service returned an invalid response. Please try again.')
  }
  response.status(200).json({ answer })
}
