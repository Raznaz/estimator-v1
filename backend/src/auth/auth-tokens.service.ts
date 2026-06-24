import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { createHash, randomUUID } from 'node:crypto';
import type { User as PublicUser } from '../shared';
import { RefreshTokenRepository } from './repository/refresh-token.repository';

export interface AuthResult {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}

interface RefreshTokenPayload {
  sub: string;
}

/**
 * SHA-256-хеш refresh-токена для хранения в БД.
 * Используем SHA-256, а не bcrypt: токен — длинный высокоэнтропийный JWT,
 * а bcrypt усекает вход до 72 байт (что приводит к ложным совпадениям префиксов).
 */
function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Выпуск/ротация/отзыв JWT-токенов.
 * Access — короткий JWT, refresh — длинный JWT, чей SHA-256-хеш хранится в БД (отзываемый).
 */
@Injectable()
export class AuthTokensService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly refreshTokens: RefreshTokenRepository,
  ) {}

  /** Выпустить пару токенов и сохранить хеш refresh в БД */
  async issueTokens(user: PublicUser): Promise<AuthResult> {
    const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email }, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET') ?? 'dev-access-secret',
      expiresIn: this.config.get<string>('JWT_ACCESS_TTL') ?? '15m',
    } as JwtSignOptions);

    // jti делает каждый refresh-токен уникальным даже при выпуске в одну секунду
    const refreshToken = await this.jwt.signAsync({ sub: user.id, jti: randomUUID() }, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET') ?? 'dev-refresh-secret',
      expiresIn: this.config.get<string>('JWT_REFRESH_TTL') ?? '7d',
    } as JwtSignOptions);

    const decoded = this.jwt.decode<{ exp?: number }>(refreshToken);
    const expiresAt = decoded?.exp
      ? new Date(decoded.exp * 1000)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const tokenHash = hashRefreshToken(refreshToken);
    await this.refreshTokens.create({ userId: user.id, tokenHash, expiresAt });

    return { user, accessToken, refreshToken };
  }

  /** Проверить refresh-токен и вернуть userId + id записи в БД (для ротации) */
  async verifyRefreshToken(refreshToken: string): Promise<{ userId: string; tokenId: string }> {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET') ?? 'dev-refresh-secret',
      });
    } catch {
      throw new UnauthorizedException('Недействительный refresh-токен');
    }

    const tokenHash = hashRefreshToken(refreshToken);
    const stored = await this.refreshTokens.findActiveByUser(payload.sub);
    const match = stored.find((row) => row.tokenHash === tokenHash);
    if (!match) {
      throw new UnauthorizedException('Refresh-токен отозван или не найден');
    }
    return { userId: payload.sub, tokenId: match.id };
  }

  /** Удалить запись refresh-токена (ротация/logout) */
  async revokeToken(tokenId: string): Promise<void> {
    await this.refreshTokens.deleteById(tokenId);
  }

  /** Проверить access-токен и вернуть userId (для socket handshake), либо null */
  async verifyAccessToken(token: string): Promise<string | null> {
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET') ?? 'dev-access-secret',
      });
      return payload.sub;
    } catch {
      return null;
    }
  }
}
