import { randomUUID } from 'node:crypto'
import { model, Schema } from 'mongoose'

export interface User {
  _id: string
  email: string
  passwordHash: string
  authVersion: number
  username?: string
}

const UserSchema = new Schema(
  {
    _id: { type: String, default: randomUUID },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    authVersion: { type: Number, required: true, default: 0, select: false },
    username: { type: String, trim: true },
  },
  {
    timestamps: false,
    versionKey: false,
    strict: true,
  },
)

export const UserModel = model<User>('User', UserSchema)
