import { randomUUID } from 'node:crypto'
import { model, Schema } from 'mongoose'

export interface StudySession {
  _id: string
  user_id: string
  task_id: string | null
  duration_minutes: number
  started_at: Date
  ended_at: Date | null
  completed: boolean
  timezone?: string
  streak_applied: boolean
}

const StudySessionSchema = new Schema(
  {
    _id: { type: String, default: randomUUID },
    user_id: { type: String, ref: 'User', required: true },
    task_id: { type: String, ref: 'Task', default: null },
    duration_minutes: { type: Number, required: true, min: 1, max: 1440 },
    started_at: { type: Date, required: true, default: Date.now },
    ended_at: { type: Date, default: null },
    completed: { type: Boolean, required: true, default: false },
    timezone: { type: String },
    streak_applied: { type: Boolean, required: true, default: false },
  },
  {
    timestamps: false,
    versionKey: false,
    strict: true,
  },
)

StudySessionSchema.index({ user_id: 1, completed: 1, started_at: -1 })

export const StudySessionModel = model<StudySession>('StudySession', StudySessionSchema)
