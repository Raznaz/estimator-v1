import { ApiProperty } from '@nestjs/swagger';
import type { AvatarPreset } from '../../../shared';

/** Готовый аватар (DiceBear). Зеркалит `AvatarPreset` из shared-контракта. */
export class AvatarPresetResponse implements AvatarPreset {
  @ApiProperty({ example: 'Salem' })
  id!: string;

  @ApiProperty({ example: 'https://api.dicebear.com/7.x/thumbs/svg?seed=Salem' })
  url!: string;
}
