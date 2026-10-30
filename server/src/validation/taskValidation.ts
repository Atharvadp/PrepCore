interface CreateTaskBody {
  title: string
  description: string
  subject: string
}

interface UpdateTaskBody {
  is_completed: boolean
}

interface ParseResult<T> {
  value?: T
  errors: string[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseCreateTaskBody(body: unknown): ParseResult<CreateTaskBody> {
  if (!isRecord(body)) {
    return { errors: ['Body must be a JSON object'] }
  }

  const errors: string[] = []
  const allowedFields = ['title', 'subject', 'description', 'user_id']
  if (Object.keys(body).some((key) => !allowedFields.includes(key))) {
    errors.push('Body contains unsupported fields')
  }
  if (typeof body.title !== 'string' || body.title.trim().length === 0) {
    errors.push('Title is required')
  }
  if (typeof body.subject !== 'string' || body.subject.trim().length === 0) {
    errors.push('Subject is required')
  }
  if (body.description !== undefined && typeof body.description !== 'string') {
    errors.push('Description must be a string')
  }

  if (errors.length > 0) {
    return { errors }
  }

  return {
    value: {
      title: (body.title as string).trim(),
      subject: (body.subject as string).trim(),
      description: typeof body.description === 'string' ? body.description : '',
    },
    errors,
  }
}

export function parseUpdateTaskBody(body: unknown): ParseResult<UpdateTaskBody> {
  if (!isRecord(body)) {
    return { errors: ['Body must be a JSON object'] }
  }
  if (
    Object.keys(body).length !== 1 ||
    !Object.hasOwn(body, 'is_completed') ||
    typeof body.is_completed !== 'boolean'
  ) {
    return { errors: ['is_completed must be a boolean and the only supported field'] }
  }
  return { value: { is_completed: body.is_completed }, errors: [] }
}

export function parseTaskListQuery(query: unknown): ParseResult<{ is_completed?: boolean }> {
  if (!isRecord(query)) {
    return { errors: ['Query parameters are invalid'] }
  }
  const keys = Object.keys(query)
  if (keys.some((key) => key !== 'is_completed')) {
    return { errors: ['Unsupported query parameter'] }
  }
  if (query.is_completed === undefined) {
    return { value: {}, errors: [] }
  }
  if (query.is_completed === 'true') {
    return { value: { is_completed: true }, errors: [] }
  }
  if (query.is_completed === 'false') {
    return { value: { is_completed: false }, errors: [] }
  }
  return { errors: ['is_completed must be true or false'] }
}

export function parseTaskId(value: unknown): string | undefined {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
    ? value
    : undefined
}
