import { randomUUID } from 'node:crypto'
import type { Request, RequestHandler } from 'express'
import mongoose from 'mongoose'
import { HttpError } from '../middleware/httpError.js'
import { StudySessionModel, type StudySession } from '../models/studySession.model.js'
import { ProfileModel } from '../models/profile.model.js'
import { TaskModel } from '../models/task.model.js'
import {
  calculateStreak,
  DEFAULT_STUDY_TIME_ZONE,
  ensureProfile,
  getStudyDate,
} from '../services/streakService.js'
import {
  parseCreateStudySessionBody,
  parseStudySessionId,
} from '../validation/studySessionValidation.js'

function getAuthenticatedUserId(request: Request): string {
  if (!request.authUserId) {
    throw new HttpError(401, 'Authentication required')
  }
  return request.authUserId
}

function serializeStudySession(session: StudySession) {
  return {
    id: session._id,
    user_id: session.user_id,
    task_id: session.task_id,
    duration_minutes: session.duration_minutes,
    started_at: session.started_at.toISOString(),
    ended_at: session.ended_at?.toISOString() ?? null,
    completed: session.completed,
    timezone: session.timezone ?? DEFAULT_STUDY_TIME_ZONE,
  }
}

function validatedStudySessionId(value: unknown): string {
  const id = parseStudySessionId(value)
  if (!id) {
    throw new HttpError(400, 'Study session ID must be a valid UUID')
  }
  return id
}

export const createStudySession: RequestHandler = async (request, response) => {
  const parsed = parseCreateStudySessionBody(request.body)
  if (!parsed.value) {
    throw new HttpError(400, 'Request validation failed', { errors: parsed.errors })
  }

  const userId = getAuthenticatedUserId(request)
  if (parsed.value.task_id !== null) {
    const task = await TaskModel.findOne({
      _id: parsed.value.task_id,
      user_id: userId,
    }).select('_id')
    if (!task) {
      throw new HttpError(400, 'task_id must refer to a task owned by the authenticated user')
    }
  }

  const session = await StudySessionModel.create({
    _id: randomUUID(),
    user_id: userId,
    task_id: parsed.value.task_id,
    duration_minutes: parsed.value.duration_minutes,
    timezone: parsed.value.timezone,
    started_at: new Date(),
    ended_at: null,
    completed: false,
  })
  response.status(201).json({ session: serializeStudySession(session) })
}

export const listCompletedStudySessions: RequestHandler = async (request, response) => {
  const sessions = await StudySessionModel.find({
    user_id: getAuthenticatedUserId(request),
    completed: true,
  }).sort({ started_at: -1 })
  response.status(200).json({ sessions: sessions.map(serializeStudySession) })
}

export const completeStudySession: RequestHandler = async (request, response) => {
  const id = validatedStudySessionId(request.params.id)
  const userId = getAuthenticatedUserId(request)
  const ownedSession = await StudySessionModel.findOne({ _id: id, user_id: userId }).select('_id')
  if (!ownedSession) {
    throw new HttpError(404, 'Study session not found')
  }

  await ensureProfile(userId)
  const transaction = await mongoose.startSession()
  let serializedSession: ReturnType<typeof serializeStudySession> | undefined
  try {
    await transaction.withTransaction(async () => {
      serializedSession = undefined
      const session = await StudySessionModel.findOne({
        _id: id,
        user_id: userId,
      }).session(transaction)
      if (!session) {
        throw new HttpError(404, 'Study session not found')
      }

      if (!session.completed) {
        session.completed = true
        session.ended_at = new Date()
        await session.save({ session: transaction })
      }

      if (!session.streak_applied) {
        const profile = await ProfileModel.findById(userId).session(transaction)
        if (!profile) {
          throw new Error('Profile is missing during study-session completion')
        }
        const studyDate = getStudyDate(
          session.ended_at ?? new Date(),
          session.timezone ?? DEFAULT_STUDY_TIME_ZONE,
        )
        const streak = calculateStreak(
          profile.last_study_date ?? null,
          profile.current_streak ?? 0,
          profile.longest_streak ?? 0,
          studyDate,
        )
        profile.current_streak = streak.current_streak
        profile.longest_streak = streak.longest_streak
        profile.last_study_date = streak.last_study_date
        await profile.save({ session: transaction })

        session.streak_applied = true
        await session.save({ session: transaction })
      }

      serializedSession = serializeStudySession(session)
    })
  } finally {
    await transaction.endSession()
  }

  if (!serializedSession) {
    throw new Error('Study-session completion did not produce a response')
  }
  response.status(200).json({ session: serializedSession })
}

export const deleteStudySession: RequestHandler = async (request, response) => {
  const id = validatedStudySessionId(request.params.id)
  const session = await StudySessionModel.findOneAndDelete({
    _id: id,
    user_id: getAuthenticatedUserId(request),
    completed: false,
    ended_at: null,
  })
  if (!session) {
    throw new HttpError(404, 'Study session not found')
  }
  response.status(200).json({ message: 'Study session deleted' })
}
