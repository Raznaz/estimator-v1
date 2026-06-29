import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

/**
 * Лёгкий health-check для хостинга (Render и др.): отвечает быстро и без БД,
 * чтобы платформа считала сервис живым.
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Проверка доступности сервиса' })
  @ApiOkResponse({ description: 'Сервис работает' })
  check() {
    return { status: 'ok' };
  }
}
