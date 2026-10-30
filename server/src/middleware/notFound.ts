import type { RequestHandler } from 'express'
import { HttpError } from './httpError.js'

export const notFound: RequestHandler = (request, _response, next) => {
  next(new HttpError(404, `Route ${request.method} ${request.path} not found`))
}
