import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { JwtUser } from '../decorators/current-user.decorator';

/** Полезная нагрузка access-токена. */
interface AccessTokenPayload {
  sub: string;
  email?: string | null;
}

/**
 * Passport-стратегия 'jwt': извлекает Bearer-токен из заголовка Authorization,
 * проверяет подпись и срок жизни access-токена. Используется {@link JwtAuthGuard}.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET') ?? 'dev-access-secret',
    });
  }

  /** Маппинг payload токена в `request.user` ({@link JwtUser}). */
  validate(payload: AccessTokenPayload): JwtUser {
    return { userId: payload.sub, email: payload.email };
  }
}
