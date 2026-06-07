import app from './app'
import { env } from './config/env'
import { prisma } from './config/database'
import { schedulerService } from './services/scheduler.service'

async function main() {
  try {
    await prisma.$connect()
    console.log('✅ Database connected')

    schedulerService.start()

    app.listen(env.PORT, () => {
      console.log(`🚀 Server running at http://localhost:${env.PORT}`)
      console.log(`📄 API docs:       http://localhost:${env.PORT}/api`)
      console.log(`🏥 Health check:   http://localhost:${env.PORT}/health`)
      console.log(`🌍 Environment:    ${env.NODE_ENV}`)
    })
  } catch (error) {
    console.error('❌ Server failed to start:', error)
    process.exit(1)
  }
}

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...')
  await prisma.$disconnect()
  process.exit(0)
})

main()
