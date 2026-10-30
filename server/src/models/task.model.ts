import { randomUUID } from 'node:crypto'
import { model, Schema } from 'mongoose'

export interface Task {
  _id: string
  user_id: string
  title: string
  description: string
  subject: string
  is_completed: boolean
  created_at: Date
}

const TaskSchema = new Schema(
  {
    _id: { type: String, default: randomUUID },
    user_id: { type: String, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    subject: { type: String, required: true, trim: true },
    is_completed: { type: Boolean, required: true, default: false },
    created_at: { type: Date, required: true, default: Date.now },
  },
  {
    timestamps: false,
    versionKey: false,
    strict: true,
  },
)

TaskSchema.index({ user_id: 1, created_at: -1 })

export const TaskModel = model<Task>('Task', TaskSchema)
