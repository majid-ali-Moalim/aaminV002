import { Controller, Get, ServiceUnavailableException } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { PrismaService } from '../prisma/prisma.service'

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'API and database health check' })
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`
      return {
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
        port: process.env.PORT || '3001',
      }
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'disconnected',
        message: 'Check DATABASE_URL in backend/.env and ensure PostgreSQL is running.',
      })
    }
  }
}
