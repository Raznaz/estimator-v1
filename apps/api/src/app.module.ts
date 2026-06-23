import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { RoomsModule } from './rooms/rooms.module';
import { TicketsModule } from './tickets/tickets.module';
import { PokerModule } from './poker/poker.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RoomsModule,
    TicketsModule,
    PokerModule,
  ],
})
export class AppModule {}
