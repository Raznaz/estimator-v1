import { Controller } from '@nestjs/common';
import { RoomsService } from './rooms.service';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  // TODO: POST /rooms — создать комнату
  // TODO: GET  /rooms/:code — получить комнату по коду
  // TODO: PATCH /rooms/:id/close — закрыть комнату
}
