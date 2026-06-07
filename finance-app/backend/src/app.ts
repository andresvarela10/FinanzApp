import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import { env } from './config/env'
import routes from './routes/index'
import { errorHandler, notFound } from './middleware/error'

const app = express()

// ─── Security ─────────────────────────────────────────────────────────────────
app.use(helmet())
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
}))

// Rate limiting: 200 req/15min per IP
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones. Inténtalo de nuevo en 15 minutos.' },
}))

// ─── Parsing ──────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// ─── Logging ──────────────────────────────────────────────────────────────────
if (env.isDev) app.use(morgan('dev'))
else app.use(morgan('combined'))

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: env.NODE_ENV })
})

// ─── API routes ───────────────────────────────────────────────────────────────
app.use('/api', routes)

// ─── Error handling ───────────────────────────────────────────────────────────
app.use(notFound)
app.use(errorHandler)

export default app
