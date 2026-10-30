import { Router } from 'express'
import { getProfile } from '../controllers/profileController.js'
import { requireAuthentication } from '../middleware/auth.js'

export const profileRoutes = Router()

profileRoutes.get('/', requireAuthentication, getProfile)
