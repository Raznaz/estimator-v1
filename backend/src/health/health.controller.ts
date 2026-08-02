import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ApiErrorResponse } from '../common/dto/api-error-response.dto';
import { PrismaService } from '../prisma/prisma.service';
import { HealthResponse } from './dto/responses/health-response.dto';

/**
 * Health-check для оркестратора (Docker healthcheck, деплой-пайплайн).
 * Проверяет не только живость процесса, но и доступность БД: без этого
 * сервис с мёртвой базой считался бы «здоровым», и деплой проходил бы зелёным.
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Проверка доступности сервиса и БД' })
  @ApiOkResponse({ description: 'Сервис и БД работают', type: HealthResponse })
  @ApiServiceUnavailableResponse({
    description: 'База данных недоступна',
    type: ApiErrorResponse,
  })
  async check(): Promise<HealthResponse> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException('База данных недоступна');
    }
    return { status: 'ok', database: 'up' };
  }
}
