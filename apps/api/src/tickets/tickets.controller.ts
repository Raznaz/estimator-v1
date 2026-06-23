import { Controller } from '@nestjs/common';
import { TicketsService } from './tickets.service';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  // TODO: POST  /tickets — добавить тикет в комнату
  // TODO: GET   /tickets?roomId= — список тикетов комнаты
  // TODO: PATCH /tickets/:id/estimate — зафиксировать финальную оценку
}
