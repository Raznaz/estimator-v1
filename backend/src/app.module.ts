import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { HealthController } from './health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { RoomsModule } from './rooms/rooms.module';
import { TicketsModule } from './tickets/tickets.module';
import { PokerModule } from './poker/poker.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../.env' }),
    CqrsModule.forRoot(),
    PrismaModule,
    UsersModule,
    AuthModule,
    RoomsModule,
    TicketsModule,
    PokerModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
