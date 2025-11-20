export function calculateStreak(lastStudyDate: string | null, currentStreak: number): {
  newStreak: number
  shouldReset: boolean
} {
  if (!lastStudyDate) {
    // First time studying
    return { newStreak: 1, shouldReset: false }
  }

  const today = getTodayDateObject()
  const lastDate = parseDateString(lastStudyDate)

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

// Parse date string in LOCAL timezone (not UTC)
function parseDateString(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(year, month - 1, day) // Month is 0-indexed
  date.setHours(0, 0, 0, 0)
  return date
}

// Get today's date object at midnight in LOCAL timezone
function getTodayDateObject(): Date {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

export function getTodayDate(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
