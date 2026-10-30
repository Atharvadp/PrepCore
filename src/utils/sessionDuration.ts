export const SESSION_DURATION_PRESETS = [15, 30, 45, 60] as const
export const MIN_SESSION_DURATION = 1
export const MAX_SESSION_DURATION = 1440

export function parseCustomSessionDuration(value: string): number | undefined {
  if (!/^\d+$/.test(value)) {
    return undefined
  }

  const duration = Number(value)
  return Number.isSafeInteger(duration) &&
    duration >= MIN_SESSION_DURATION &&
    duration <= MAX_SESSION_DURATION
    ? duration
    : undefined
}

export function createStudySessionPayload(
  duration: number,
  taskId: string | null,
  timeZone?: string,
): { duration_minutes: number; task_id: string | null; timezone?: string } {
  return {
    duration_minutes: duration,
    task_id: taskId,
    ...(timeZone ? { timezone: timeZone } : {}),
  }
}
