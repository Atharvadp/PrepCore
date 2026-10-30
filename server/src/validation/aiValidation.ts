interface AskQuestionBody {
  question: string
}

interface ParseResult<T> {
  value?: T
  errors: string[]
}

export const MAX_AI_QUESTION_LENGTH = 2000

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseAskQuestionBody(body: unknown): ParseResult<AskQuestionBody> {
  if (!isRecord(body)) {
    return { errors: ['Body must be a JSON object'] }
  }

  const errors: string[] = []
  if (Object.keys(body).some((key) => key !== 'question')) {
    errors.push('Body contains unsupported fields')
  }
  if (typeof body.question !== 'string') {
    return { errors: [...errors, 'question must be a string'] }
  }

  const question = body.question.trim()
  if (question.length === 0 || question.length > MAX_AI_QUESTION_LENGTH) {
    errors.push(`question must be between 1 and ${MAX_AI_QUESTION_LENGTH} characters`)
  }

  if (errors.length > 0) {
    return { errors }
  }
  return { value: { question }, errors }
}
