import cron from 'node-cron'
import { prisma } from '../config/database'
import { marketDataService } from './market-data.service'

class SchedulerService {
  start() {
    console.log('⏰ Starting scheduler...')

    // Update NAVs every weekday at 20:00 (after European market close)
    cron.schedule('0 20 * * 1-5', async () => {
      console.log('🔄 [CRON] Daily NAV update started')
      try {
        const users = await prisma.user.findMany({ select: { id: true } })
        for (const user of users) {
          await marketDataService.updateAllFundsNav(user.id)
        }
        console.log('✅ [CRON] Daily NAV update complete')
      } catch (e) {
        console.error('❌ [CRON] NAV update failed:', e)
      }
    }, { timezone: 'Europe/Madrid' })

    // Monthly net worth snapshot on the 1st at 01:00
    cron.schedule('0 1 1 * *', async () => {
      console.log('📸 [CRON] Monthly net worth snapshot')
      try {
        const users = await prisma.user.findMany({ select: { id: true } })
        for (const user of users) {
          await marketDataService.updatePortfolioValueSnapshot(user.id)
        }
      } catch (e) {
        console.error('❌ [CRON] Snapshot failed:', e)
      }
    }, { timezone: 'Europe/Madrid' })

    console.log('✅ Scheduler running')
  }
}

export const schedulerService = new SchedulerService()
