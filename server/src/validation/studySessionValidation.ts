interface CreateStudySessionBody {
  duration_minutes: number
  task_id: string | null
  timezone: string
}

interface ParseResult<T> {
  value?: T
  errors: string[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseCreateStudySessionBody(
  body: unknown,
): ParseResult<CreateStudySessionBody> {
  if (!isRecord(body)) {
    return { errors: ['Body must be a JSON object'] }
  }

  const errors: string[] = []
  if (Object.keys(body).some((key) => !['duration_minutes', 'task_id', 'timezone'].includes(key))) {
    errors.push('Body contains unsupported fields')
  }
  if (
    typeof body.duration_minutes !== 'number' ||
    !Number.isInteger(body.duration_minutes) ||
    body.duration_minutes < 1 ||
    body.duration_minutes > 1440
  ) {
    errors.push('duration_minutes must be an integer between 1 and 1440')
  }
  if (
    body.task_id !== undefined &&
    body.task_id !== null &&
    (typeof body.task_id !== 'string' || !parseStudySessionId(body.task_id))
  ) {
    errors.push('task_id must be a valid UUID or null')
  }
  if (
    body.timezone !== undefined &&
    (typeof body.timezone !== 'string' || !isValidTimeZone(body.timezone))
  ) {
    errors.push('timezone must be a valid IANA time zone')
  }

  if (errors.length > 0) {
    return { errors }
  }

  return {
    value: {
      duration_minutes: body.duration_minutes as number,
      task_id: typeof body.task_id === 'string' ? body.task_id : null,
      timezone: typeof body.timezone === 'string' ? body.timezone : 'UTC',
    },
    errors,
  }
}

function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value })
    return true
  } catch {
    return false
  }
}

export function parseStudySessionId(value: unknown): string | undefined {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
    ? value
    : undefined
}
