import { ApiProperty } from '@nestjs/swagger';
import { UserResponse } from '../../../users/dto/responses/user-response.dto';
import { RoomResponse } from './room-response.dto';

/**
 * Ответ создания комнаты. Поля `user`/`accessToken`/`refreshToken` присутствуют
 * только когда владельцем стал новый гость (для него выпускается пара токенов).
 */
export class CreateRoomResponse {
  @ApiProperty({ type: RoomResponse })
  room!: RoomResponse;

  @ApiProperty({ type: UserResponse, required: false })
  user?: UserResponse;

  @ApiProperty({ required: false, description: 'Access-токен нового гостя-владельца' })
  accessToken?: string;

  @ApiProperty({ required: false, description: 'Refresh-токен нового гостя-владельца' })
  refreshToken?: string;
}
