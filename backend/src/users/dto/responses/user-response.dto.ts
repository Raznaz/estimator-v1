import { ApiProperty } from '@nestjs/swagger';
import type { User as PublicUser } from '../../../shared';

/** Публичный профиль пользователя (без passwordHash). Зеркалит `User` из shared-контракта. */
export class UserResponse implements PublicUser {
  @ApiProperty({ example: 'clx123abc' })
  id!: string;

  @ApiProperty({ example: 'Иван Петров' })
  name!: string;

  @ApiProperty({ required: false, nullable: true, example: 'ivan@example.com' })
  email?: string | null;

  /** URL аватара: пресет DiceBear или загруженный файл (/static/...). */
  @ApiProperty({ required: false, nullable: true, example: '/static/avatars/clx123abc-1700000000.png' })
  avatarUrl?: string | null;

  @ApiProperty({ format: 'date-time', example: '2026-06-29T12:00:00.000Z' })
  createdAt!: string;
}
