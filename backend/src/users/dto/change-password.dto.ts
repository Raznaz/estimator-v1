import { IsString, MinLength } from 'class-validator';

/** Тело запроса `POST /users/me/password`. */
export class ChangePasswordDto {
  /** Текущий пароль (сверяется с сохранённым хешем). */
  @IsString()
  @MinLength(1)
  oldPassword!: string;

  /** Новый пароль (минимум 8 символов). */
  @IsString()
  @MinLength(8)
  newPassword!: string;
}
