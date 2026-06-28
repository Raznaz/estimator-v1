import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import type { ScaleType } from '../../shared';

const SCALE_TYPES: ScaleType[] = ['FIBONACCI', 'MODIFIED_FIBONACCI', 'T_SHIRT', 'POWERS_OF_TWO'];

export class CreateRoomDto {
  /** Имя владельца-гостя (для зарегистрированных берётся из профиля). */
  @IsOptional()
  @IsString()
  @MaxLength(60)
  ownerName?: string;

  /** Название комнаты (необязательное). */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  /** Шкала оценки; по умолчанию FIBONACCI. */
  @IsOptional()
  @IsIn(SCALE_TYPES)
  scaleType?: ScaleType;
}
