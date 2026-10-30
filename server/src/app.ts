import cors from 'cors'
import cookieParser from 'cookie-parser'
import express from 'express'
import helmet from 'helmet'
import { config } from './config/env.js'
import { authRoutes } from './routes/authRoutes.js'
import { healthRoutes } from './routes/healthRoutes.js'
import { taskRoutes } from './routes/taskRoutes.js'
import { studySessionRoutes } from './routes/studySessionRoutes.js'
import { profileRoutes } from './routes/profileRoutes.js'
import { aiRoutes } from './routes/aiRoutes.js'
import { errorHandler } from './middleware/errorHandler.js'
import { HttpError } from './middleware/httpError.js'
import { notFound } from './middleware/notFound.js'
import { createCsrfProtection } from './middleware/csrfProtection.js'

export const app = express()

app.disable('x-powered-by')
app.use(helmet())
app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || config.corsOrigins.includes(origin)) {
        callback(null, true)
        return
      }
      callback(new HttpError(403, 'Origin is not allowed by CORS'))
    },
  }),
)
app.use(createCsrfProtection(config.corsOrigins, config.nodeEnv === 'production'))
app.use(express.json({ limit: '100kb' }))
app.use(cookieParser())

app.use('/api', healthRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/tasks', taskRoutes)
app.use('/api/study-sessions', studySessionRoutes)
app.use('/api/profile', profileRoutes)
app.use('/api/ai', aiRoutes)
app.use(notFound)
app.use(errorHandler)
