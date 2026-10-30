import { app } from './app.js'
import { connectToDatabase } from './config/database.js'
import { config } from './config/env.js'
import mongoose from 'mongoose'

function sanitizeDiagnostic(value: string): string {
  return value
    .replace(/mongodb(?:\+srv)?:\/\/[^\s"'<>]+/gi, '[REDACTED_MONGODB_URI]')
    .replace(
      /\b(?:password|passwd|secret|token|api[_-]?key)\b(\s*[=:]\s*)[^\s,;]+/gi,
      '$1[REDACTED]',
    )
}

function getConnectionCauses(error: unknown): string[] {
  if (!(error instanceof Error) || !('reason' in error)) {
    return []
  }

  const reason = error.reason
  if (!reason || typeof reason !== 'object' || !('servers' in reason) || !(reason.servers instanceof Map)) {
    return []
  }

  const causes = new Set<string>()
  for (const server of reason.servers.values()) {
    if (server && typeof server === 'object' && 'error' in server && server.error instanceof Error) {
      causes.add(`${server.error.name}: ${sanitizeDiagnostic(server.error.message)}`)
    }
  }
  return [...causes]
}

async function startServer(): Promise<void> {
  await connectToDatabase()
  const server = app.listen(config.port, () => {
    console.info(`PrepCore API listening on port ${config.port}`)
  })

  const shutdown = () => {
    server.close(() => {
      void mongoose.disconnect().then(
        () => process.exit(0),
        () => {
          console.error('MongoDB disconnect failed during shutdown')
          process.exit(1)
        },
      )
    })
  }

  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)
}

void startServer().catch((error: unknown) => {
  const details =
    error instanceof Error
      ? `${error.name}: ${sanitizeDiagnostic(error.message)}`
      : 'Unknown startup error'
  console.error(`Unable to start PrepCore API: ${details}`)
  for (const cause of getConnectionCauses(error)) {
    console.error(`MongoDB connection detail: ${cause}`)
  }
  process.exitCode = 1
})
