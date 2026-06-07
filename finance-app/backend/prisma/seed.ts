import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const defaultCategories = {
  income: [
    { name: 'Salario', color: '#00c896', icon: '💼' },
    { name: 'Freelance', color: '#00d4aa', icon: '💻' },
    { name: 'Inversiones', color: '#6366f1', icon: '📈' },
    { name: 'Alquiler', color: '#f7a325', icon: '🏠' },
    { name: 'Dividendos', color: '#10b981', icon: '💰' },
    { name: 'Otros ingresos', color: '#94a3b8', icon: '✨' },
  ],
  expense: [
    { name: 'Vivienda', color: '#ef4444', icon: '🏡' },
    { name: 'Alimentación', color: '#f97316', icon: '🛒' },
    { name: 'Transporte', color: '#eab308', icon: '🚗' },
    { name: 'Salud', color: '#ec4899', icon: '❤️' },
    { name: 'Ocio', color: '#8b5cf6', icon: '🎮' },
    { name: 'Educación', color: '#3b82f6', icon: '📚' },
    { name: 'Ropa', color: '#a78bfa', icon: '👕' },
    { name: 'Tecnología', color: '#06b6d4', icon: '📱' },
    { name: 'Restaurantes', color: '#f59e0b', icon: '🍽️' },
    { name: 'Suscripciones', color: '#6366f1', icon: '📺' },
    { name: 'Seguros', color: '#64748b', icon: '🛡️' },
    { name: 'Inversiones', color: '#10b981', icon: '📊' },
    { name: 'Otros gastos', color: '#94a3b8', icon: '📦' },
  ],
}

async function main() {
  console.log('🌱 Starting database seed...')

  // Create demo user
  const passwordHash = await bcrypt.hash('demo1234', 12)

  const user = await prisma.user.upsert({
    where: { email: 'demo@finanzas.app' },
    update: {},
    create: {
      email: 'demo@finanzas.app',
      passwordHash,
      name: 'Usuario Demo',
    },
  })

  console.log(`✅ Demo user created: ${user.email}`)

  // Create default categories for demo user
  for (const [type, cats] of Object.entries(defaultCategories)) {
    for (const cat of cats) {
      await prisma.category.upsert({
        where: {
          id: `${user.id}-${type}-${cat.name.toLowerCase().replace(/\s+/g, '-')}`,
        },
        update: {},
        create: {
          id: `${user.id}-${type}-${cat.name.toLowerCase().replace(/\s+/g, '-')}`,
          userId: user.id,
          name: cat.name,
          type,
          color: cat.color,
          icon: cat.icon,
          isDefault: true,
        },
      })
    }
  }

  console.log('✅ Default categories created')

  // Add some common index funds
  const funds = [
    {
      name: 'Vanguard Global Stock Index EUR Acc',
      isin: 'IE00B03HCZ61',
      etfProxy: 'VWCE.DE',
      category: 'world',
      broker: 'MyInvestor',
    },
    {
      name: 'iShares Core MSCI World UCITS ETF',
      isin: 'IE00B4L5Y983',
      etfProxy: 'IWDA.AS',
      category: 'world',
      broker: 'MyInvestor',
    },
    {
      name: 'Vanguard S&P 500 UCITS ETF USD Acc',
      isin: 'IE00B3XXRP09',
      etfProxy: 'VUSD.L',
      category: 'sp500',
      broker: 'MyInvestor',
    },
    {
      name: 'iShares Core S&P 500 UCITS ETF',
      isin: 'IE00B5BMR087',
      etfProxy: 'SXR8.DE',
      category: 'sp500',
      broker: 'MyInvestor',
    },
    {
      name: 'Vanguard Emerging Markets Stock Index',
      isin: 'IE00B3VVMM84',
      etfProxy: 'VFEM.AS',
      category: 'emerging',
      broker: 'MyInvestor',
    },
    {
      name: 'Invesco EQQQ NASDAQ-100 UCITS ETF',
      isin: 'IE0032077012',
      etfProxy: 'EQQQ.L',
      category: 'nasdaq',
      broker: 'MyInvestor',
    },
  ]

  for (const fund of funds) {
    await prisma.fund.upsert({
      where: {
        id: `demo-${fund.isin}`,
      },
      update: {},
      create: {
        id: `demo-${fund.isin}`,
        userId: user.id,
        ...fund,
      },
    })
  }

  console.log('✅ Common index funds added')
  console.log('')
  console.log('🎉 Seed complete!')
  console.log('   Email:    demo@finanzas.app')
  console.log('   Password: demo1234')
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
