import { Module } from '@nestjs/common';
import { PokerGateway } from './poker.gateway';
import { PokerService } from './poker.service';

@Module({
  providers: [PokerGateway, PokerService],
})
export class PokerModule {}
