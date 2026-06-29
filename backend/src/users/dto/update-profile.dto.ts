import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** Тело запроса `PATCH /users/me`; все поля необязательны (частичное обновление). */
export class UpdateProfileDto {
  /** Новое отображаемое имя (1–60 символов). */
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name?: string;

  /** Новый email; должен оставаться уникальным. */
  @IsOptional()
  @IsEmail()
  email?: string;

  /** URL аватара: пресет DiceBear или ранее загруженный файл (`/static/avatars/...`). */
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
