import { IsEmail, IsString, MinLength } from 'class-validator';

/** Тело запроса `POST /auth/login`. */
export class LoginDto {
  /** Email пользователя. */
  @IsEmail()
  email!: string;

  /** Пароль в открытом виде (проверяется против сохранённого хеша). */
  @IsString()
  @MinLength(1)
  password!: string;
}
