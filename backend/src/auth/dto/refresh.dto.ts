import { IsString, MinLength } from 'class-validator';

/** Тело запросов `POST /auth/refresh` и `POST /auth/logout`. */
export class RefreshDto {
  /** Refresh-токен (JWT), полученный при логине/регистрации. */
  @IsString()
  @MinLength(1)
  refreshToken!: string;
}
