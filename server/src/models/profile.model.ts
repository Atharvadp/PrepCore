import { model, Schema } from 'mongoose'

export interface Profile {
  _id: string
  username?: string
  current_streak: number
  longest_streak: number
  last_study_date: string | null
  created_at: Date
}

const ProfileSchema = new Schema(
  {
    _id: { type: String, ref: 'User', required: true },
    username: { type: String, trim: true },
    current_streak: { type: Number, required: true, default: 0 },
    longest_streak: { type: Number, required: true, default: 0 },
    last_study_date: { type: String, default: null },
    created_at: { type: Date, required: true, default: Date.now },
  },
  {
    timestamps: false,
    versionKey: false,
    strict: true,
  },
)

export const ProfileModel = model<Profile>('Profile', ProfileSchema)
