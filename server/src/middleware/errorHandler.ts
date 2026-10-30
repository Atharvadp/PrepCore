import type { ErrorRequestHandler } from 'express'
import { Error as MongooseError } from 'mongoose'
import { HttpError } from './httpError.js'

export const errorHandler: ErrorRequestHandler = (error, _request, response, next) => {
  void next

  if (error instanceof HttpError) {
    response.status(error.statusCode).json({
      error: error.message,
      ...(error.details === undefined ? {} : { details: error.details }),
    })
    return
  }

  if (error instanceof MongooseError.ValidationError) {
    response.status(400).json({ error: 'Request validation failed' })
    return
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 11000
  ) {
    response.status(409).json({ error: 'An account with this email already exists' })
    return
  }

  if (error instanceof SyntaxError && 'status' in error && error.status === 400) {
    response.status(400).json({ error: 'Invalid JSON request body' })
    return
  }

  console.error('Unhandled request error')
  response.status(500).json({ error: 'Internal server error' })
}
