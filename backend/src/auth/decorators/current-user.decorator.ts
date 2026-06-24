import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** Полезная нагрузка пользователя, извлекаемая из JWT access-токена */
export interface JwtUser {
  userId: string;
  email?: string | null;
}

/** Достаёт текущего пользователя (request.user), проставленного JwtStrategy */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtUser => {
    const request = ctx.switchToHttp().getRequest<{ user: JwtUser }>();
    return request.user;
  },
);
