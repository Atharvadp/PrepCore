import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { HttpError } from './httpError.js'

export type RequestValidator = (request: Request) => string[]

export function validateRequest(validator: RequestValidator): RequestHandler {
  return (request: Request, _response: Response, next: NextFunction) => {
    const errors = validator(request)
    if (errors.length > 0) {
      next(new HttpError(400, 'Request validation failed', { errors }))
      return
    }
    next()
  }
}
