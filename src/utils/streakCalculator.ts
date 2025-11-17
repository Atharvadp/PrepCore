export function calculateStreak(lastStudyDate: string | null, currentStreak: number): {
  newStreak: number
  shouldReset: boolean
} {
  if (!lastStudyDate) {
    // First time studying
    return { newStreak: 1, shouldReset: false }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const lastDate = new Date(lastStudyDate)
  lastDate.setHours(0, 0, 0, 0)

  const diffTime = today.getTime() - lastDate.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    // Same day - don't increment
    return { newStreak: currentStreak, shouldReset: false }
  } else if (diffDays === 1) {
    // Consecutive day - increment streak
    return { newStreak: currentStreak + 1, shouldReset: false }
  } else {
    // Missed days - reset streak
    return { newStreak: 1, shouldReset: true }
  }
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function getTodayDate(): string {
  return formatDate(new Date())
}
