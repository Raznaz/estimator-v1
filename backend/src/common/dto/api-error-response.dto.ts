import { ApiProperty } from '@nestjs/swagger';

/**
 * Стандартное тело ошибки NestJS (формирует встроенный exception filter).
 * Используется в `@ApiResponse` для документирования ошибочных ответов.
 */
export class ApiErrorResponse {
  /** HTTP-код ошибки. */
  @ApiProperty({ example: 400 })
  statusCode!: number;

  /** Сообщение(я) об ошибке; для ошибок валидации — массив строк. */
  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    example: 'Email уже используется',
  })
  message!: string | string[];

  /** Краткое название ошибки (например, "Bad Request"). */
  @ApiProperty({ required: false, example: 'Bad Request' })
  error?: string;
}
