import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

/** Тело запроса `POST /auth/register`. */
export class RegisterDto {
  /** Отображаемое имя пользователя (1–60 символов). */
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name!: string;

  /** Email пользователя; должен быть уникальным. */
  @IsEmail()
  email!: string;

  /** Пароль в открытом виде (8–128 символов); хешируется перед сохранением. */
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
