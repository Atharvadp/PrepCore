import { Router } from 'express'
import { askAiQuestion } from '../controllers/aiController.js'
import { aiRateLimit } from '../middleware/aiRateLimit.js'
import { requireAuthentication } from '../middleware/auth.js'
import { validateRequest } from '../middleware/validateRequest.js'
import { parseAskQuestionBody } from '../validation/aiValidation.js'

export function createAiRouter(authenticate = requireAuthentication) {
  const router = Router()

  router.post(
    '/ask',
    authenticate,
    validateRequest((request) => parseAskQuestionBody(request.body).errors),
    aiRateLimit,
    askAiQuestion,
  )

  return router
}

export const aiRoutes = createAiRouter()
