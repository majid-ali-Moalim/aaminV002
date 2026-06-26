import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

async function main() {
  const envPath = path.join(process.cwd(), '.env')
  const required = ['DATABASE_URL', 'JWT_SECRET', 'PORT']
  const missing: string[] = []

  if (!fs.existsSync(envPath)) {
    console.error('FAIL: backend/.env file not found')
    process.exit(1)
  }

  const envText = fs.readFileSync(envPath, 'utf8')
  for (const key of required) {
    if (!process.env[key] && !new RegExp(`^${key}=`, 'm').test(envText)) {
      missing.push(key)
    }
  }

  if (missing.length) {
    console.error('FAIL: Missing env keys:', missing.join(', '))
    process.exit(1)
  }

  await prisma.$queryRaw`SELECT 1`
  const userCount = await prisma.user.count()
  const migrations = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count FROM "_prisma_migrations" WHERE finished_at IS NOT NULL
  `

  console.log('OK: Database connected')
  console.log(`OK: DATABASE_URL -> ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@')}`)
  console.log(`OK: Users in database: ${userCount}`)
  console.log(`OK: Applied migrations: ${migrations[0]?.count ?? 0}`)
  console.log(`OK: Backend PORT=${process.env.PORT || '3001'}`)
  console.log(`OK: FRONTEND_URL=${process.env.FRONTEND_URL || '(not set)'}`)
}

main()
  .catch((err) => {
    console.error('FAIL:', err instanceof Error ? err.message : err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
