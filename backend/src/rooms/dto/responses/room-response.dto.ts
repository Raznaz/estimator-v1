import { ApiProperty } from '@nestjs/swagger';
import type { Room as PublicRoom, RoomStatus, ScaleType } from '../../../shared';

const SCALE_TYPES: ScaleType[] = ['FIBONACCI', 'MODIFIED_FIBONACCI', 'T_SHIRT', 'POWERS_OF_TWO'];
const ROOM_STATUSES: RoomStatus[] = ['ACTIVE', 'CLOSED'];

/** Публичные данные комнаты. Зеркалит `Room` из shared-контракта. */
export class RoomResponse implements PublicRoom {
  @ApiProperty({ example: 'clx456def' })
  id!: string;

  @ApiProperty({ example: 'Комната ABCDEF' })
  name!: string;

  /** Короткий код для входа в комнату. */
  @ApiProperty({ example: 'ABCDEF' })
  code!: string;

  @ApiProperty({ example: 'clx123abc' })
  ownerId!: string;

  @ApiProperty({ enum: SCALE_TYPES, example: 'FIBONACCI' })
  scaleType!: ScaleType;

  @ApiProperty({ enum: ROOM_STATUSES, example: 'ACTIVE' })
  status!: RoomStatus;

  @ApiProperty({ format: 'date-time', example: '2026-06-29T12:00:00.000Z' })
  createdAt!: string;
}
