import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AuthModule } from '../auth/auth.module';
import { TicketsModule } from '../tickets/tickets.module';
import { PokerGateway } from './poker.gateway';
import { PokerService } from './poker.service';

@Module({
  imports: [CqrsModule, AuthModule, TicketsModule],
  providers: [PokerGateway, PokerService],
})
export class PokerModule {}
