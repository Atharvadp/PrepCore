import type { Request, RequestHandler } from 'express'
import { HttpError } from '../middleware/httpError.js'
import { ProfileModel } from '../models/profile.model.js'
import { UserModel } from '../models/user.model.js'
import { ensureProfile } from '../services/streakService.js'

function getAuthenticatedUserId(request: Request): string {
  if (!request.authUserId) {
    throw new HttpError(401, 'Authentication required')
  }
  return request.authUserId
}

export const getProfile: RequestHandler = async (request, response) => {
  const userId = getAuthenticatedUserId(request)
  const user = await UserModel.findById(userId).select('username')
  if (!user) {
    throw new HttpError(401, 'Authentication required')
  }

  await ensureProfile(userId)
  const profile = await ProfileModel.findById(userId)
  if (!profile) {
    throw new Error('Profile initialization did not produce a profile')
  }

  response.status(200).json({
    profile: {
      id: profile._id,
      username: user.username ?? '',
      current_streak: profile.current_streak,
      longest_streak: profile.longest_streak,
      last_study_date: profile.last_study_date,
      created_at: profile.created_at.toISOString(),
    },
  })
}
