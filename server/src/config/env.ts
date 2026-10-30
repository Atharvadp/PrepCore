import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const envPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../.env')
dotenv.config({ path: envPath })

function required(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function readPort(value: string | undefined): number {
  if (value === undefined || value.trim() === '') {
    return 3000
  }

  const port = Number(value)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535')
  }
  return port
}

const nodeEnv = process.env.NODE_ENV?.trim() || 'development'
const configuredOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

for (const origin of configuredOrigins) {
  try {
    const parsedOrigin = new URL(origin)
    if (parsedOrigin.origin !== origin || !['http:', 'https:'].includes(parsedOrigin.protocol)) {
      throw new Error()
    }
  } catch {
    throw new Error('CORS_ORIGINS must contain exact http(s) origins separated by commas')
  }
}

export const config = {
  nodeEnv,
  port: readPort(process.env.PORT),
  mongodbUri: required('MONGODB_URI'),
  authTokenSecret: (() => {
    const secret = required('AUTH_TOKEN_SECRET')
    if (Buffer.byteLength(secret, 'utf8') < 32) {
      throw new Error('AUTH_TOKEN_SECRET must be at least 32 bytes')
    }
    return secret
  })(),
  authTokenTtlSeconds: 60 * 60 * 24 * 7,
  groqApiKey: process.env.GROQ_API_KEY?.trim() || undefined,
  corsOrigins: [
    ...configuredOrigins,
    ...(nodeEnv === 'production'
      ? []
      : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:4173', 'http://127.0.0.1:4173']),
  ],
}
