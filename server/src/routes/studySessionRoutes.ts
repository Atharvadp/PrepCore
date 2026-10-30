import type { Request } from 'express'
import { Router } from 'express'
import {
  completeStudySession,
  createStudySession,
  deleteStudySession,
  listCompletedStudySessions,
} from '../controllers/studySessionController.js'
import { requireAuthentication } from '../middleware/auth.js'
import { validateRequest } from '../middleware/validateRequest.js'
import { parseCreateStudySessionBody, parseStudySessionId } from '../validation/studySessionValidation.js'

export const studySessionRoutes = Router()

function validateStudySessionId(request: Request): string[] {
  return parseStudySessionId(request.params.id)
    ? []
    : ['Study session ID must be a valid UUID']
}

studySessionRoutes.use(requireAuthentication)
studySessionRoutes.post(
  '/',
  validateRequest((request) => parseCreateStudySessionBody(request.body).errors),
  createStudySession,
)
studySessionRoutes.get('/', listCompletedStudySessions)
studySessionRoutes.patch(
  '/:id/complete',
  validateRequest(validateStudySessionId),
  completeStudySession,
)
studySessionRoutes.delete(
  '/:id',
  validateRequest(validateStudySessionId),
  deleteStudySession,
)
