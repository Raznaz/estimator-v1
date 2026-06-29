import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { AVATAR_PRESETS, type AvatarPreset } from '../../../shared';

/** Получить список из 20 готовых аватаров (DiceBear) */
export class GetAvatarPresetsQuery {}

/** Возвращает статичный список пресетов аватаров {@link AVATAR_PRESETS}. */
@QueryHandler(GetAvatarPresetsQuery)
export class GetAvatarPresetsHandler
  implements IQueryHandler<GetAvatarPresetsQuery, readonly AvatarPreset[]>
{
  execute(): Promise<readonly AvatarPreset[]> {
    return Promise.resolve(AVATAR_PRESETS);
  }
}
