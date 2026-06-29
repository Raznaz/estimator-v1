import { ApiProperty } from '@nestjs/swagger';
import { UserResponse } from '../../../users/dto/responses/user-response.dto';
import type { AuthResult } from '../../auth-tokens.service';

/** Результат аутентификации: профиль и пара токенов. Зеркалит `AuthResult`. */
export class AuthResponse implements AuthResult {
  @ApiProperty({ type: UserResponse })
  user!: UserResponse;

  /** Короткоживущий access-токен (JWT) для заголовка Authorization. */
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken!: string;

  /** Долгоживущий refresh-токен (JWT) для обновления пары. */
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  refreshToken!: string;
}
