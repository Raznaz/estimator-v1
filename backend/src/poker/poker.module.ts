import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AuthModule } from '../auth/auth.module';
import { PokerGateway } from './poker.gateway';
import { PokerService } from './poker.service';

@Module({
  imports: [CqrsModule, AuthModule],
  providers: [PokerGateway, PokerService],
})
export class PokerModule {}
