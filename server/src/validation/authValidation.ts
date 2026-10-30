interface SignupBody {
  email: string
  password: string
  username?: string
}

interface LoginBody {
  email: string
  password: string
}

interface ParseResult<T> {
  value?: T
  errors: string[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseCredentials(
  body: unknown,
  allowedKeys: readonly string[],
): ParseResult<LoginBody> {
  if (!isRecord(body)) {
    return { errors: ['Body must be a JSON object'] }
  }

  const errors: string[] = []
  if (Object.keys(body).some((key) => !allowedKeys.includes(key))) {
    errors.push('Body contains unsupported fields')
  }

  let email = ''
  if (typeof body.email !== 'string') {
    errors.push('Email is required')
  } else {
    email = body.email.trim().toLowerCase()
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('Email must be a valid email address')
    }
  }

  let password = ''
  if (typeof body.password !== 'string') {
    errors.push('Password is required')
  } else {
    password = body.password
    const passwordBytes = Buffer.byteLength(password, 'utf8')
    if (passwordBytes < 8 || passwordBytes > 72) {
      errors.push('Password must be between 8 and 72 UTF-8 bytes')
    }
  }

  return errors.length > 0
    ? { errors }
    : { value: { email, password }, errors }
}

export function parseSignupBody(body: unknown): ParseResult<SignupBody> {
  const credentials = parseCredentials(body, ['email', 'password', 'username'])
  if (!credentials.value) {
    return { errors: credentials.errors }
  }

  let username: string | undefined
  if (isRecord(body) && body.username !== undefined) {
    if (typeof body.username !== 'string') {
      return { errors: ['Username must be a string'] }
    }
    username = body.username.trim()
    if (username.length === 0 || username.length > 50) {
      return { errors: ['Username must be between 1 and 50 characters'] }
    }
  }

  return {
    value: {
      ...credentials.value,
      ...(username === undefined ? {} : { username }),
    },
    errors: [],
  }
}

export function parseLoginBody(body: unknown): ParseResult<LoginBody> {
  return parseCredentials(body, ['email', 'password'])
}
