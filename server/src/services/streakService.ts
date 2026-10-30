import { ProfileModel } from '../models/profile.model.js'
import { UserModel } from '../models/user.model.js'

export const DEFAULT_STUDY_TIME_ZONE = 'UTC'

export interface StreakResult {
  current_streak: number
  longest_streak: number
  last_study_date: string
}

export function getStudyDate(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = new Map(parts.map(({ type, value }) => [type, value]))
  const year = values.get('year')
  const month = values.get('month')
  const day = values.get('day')
  if (!year || !month || !day) {
    throw new Error('Unable to calculate the study date')
  }
  return `${year}-${month}-${day}`
}

function calendarDayNumber(value: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) {
    throw new Error('Stored study date is invalid')
  }
  const [, year, month, day] = match
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  ) {
    throw new Error('Stored study date is invalid')
  }
  return date.getTime() / 86_400_000
}

export function calculateStreak(
  lastStudyDate: string | null,
  currentStreak: number,
  longestStreak: number,
  studyDate: string,
): StreakResult {
  let newStreak = 1
  if (lastStudyDate !== null) {
    const difference = calendarDayNumber(studyDate) - calendarDayNumber(lastStudyDate)
    if (difference === 0) {
      newStreak = currentStreak
    } else if (difference === 1) {
      newStreak = currentStreak + 1
    }
  }

  return {
    current_streak: newStreak,
    longest_streak: Math.max(longestStreak, newStreak),
    last_study_date: studyDate,
  }
}

export async function ensureProfile(userId: string): Promise<void> {
  const user = await UserModel.findById(userId).select('username')
  if (!user) {
    throw new Error('Authenticated user no longer exists')
  }

  try {
    await ProfileModel.findOneAndUpdate(
      { _id: userId },
      {
        $setOnInsert: {
          ...(user.username === undefined ? {} : { username: user.username }),
          current_streak: 0,
          longest_streak: 0,
          last_study_date: null,
          created_at: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )
  } catch (error: unknown) {
    if (
      typeof error !== 'object' ||
      error === null ||
      !('code' in error) ||
      error.code !== 11000
    ) {
      throw error
    }
    const concurrentProfile = await ProfileModel.findById(userId).select('_id')
    if (!concurrentProfile) {
      throw error
    }
  }
}
