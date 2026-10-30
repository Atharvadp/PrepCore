import type { RequestHandler } from 'express'
import mongoose from 'mongoose'

export const getHealth: RequestHandler = (_request, response) => {
  const connected = mongoose.connection.readyState === 1
  response.status(connected ? 200 : 503).json({
    status: connected ? 'ok' : 'unavailable',
    database: connected ? 'connected' : 'disconnected',
  })
}
