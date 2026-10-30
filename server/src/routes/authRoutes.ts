import { Router } from 'express'
import { login, logout, me, signup } from '../controllers/authController.js'
import { requireAuthentication } from '../middleware/auth.js'
import { validateRequest } from '../middleware/validateRequest.js'
import { parseLoginBody, parseSignupBody } from '../validation/authValidation.js'

export const authRoutes = Router()

authRoutes.post(
  '/signup',
  validateRequest((request) => parseSignupBody(request.body).errors),
  signup,
)
authRoutes.post(
  '/login',
  validateRequest((request) => parseLoginBody(request.body).errors),
  login,
)
authRoutes.post('/logout', requireAuthentication, logout)
authRoutes.get('/me', requireAuthentication, me)
