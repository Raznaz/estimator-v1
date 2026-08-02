import { ApiProperty } from '@nestjs/swagger';

/** Ответ health-check: сервис отвечает и база данных доступна. */
export class HealthResponse {
  @ApiProperty({ example: 'ok' })
  status!: string;

  @ApiProperty({ example: 'up', description: 'Состояние подключения к PostgreSQL' })
  database!: string;
}
