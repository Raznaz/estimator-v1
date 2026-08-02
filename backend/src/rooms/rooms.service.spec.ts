import { NotFoundException } from '@nestjs/common';
import type { Room as PrismaRoom } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RoomsService } from './rooms.service';

/**
 * Пример тестирования сервиса без базы: PrismaService подменяется заглушкой
 * с jest-моками. Проверяем собственную логику сервиса, а не работу Prisma.
 */
describe('RoomsService', () => {
  /** Минимальная заглушка Prisma — только используемые сервисом методы. */
  function createPrismaMock() {
    return {
      room: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };
  }

  function makeRoom(overrides: Partial<PrismaRoom> = {}): PrismaRoom {
    return {
      id: 'room-1',
      code: 'ABC234',
      name: 'Комната ABC234',
      ownerId: 'user-1',
      scaleType: 'FIBONACCI',
      status: 'ACTIVE',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      ...overrides,
    } as PrismaRoom;
  }

  describe('create', () => {
    it('генерирует код из 6 символов алфавита без похожих знаков (0/O, 1/I)', async () => {
      const prisma = createPrismaMock();
      prisma.room.findUnique.mockResolvedValue(null); // код свободен
      prisma.room.create.mockImplementation(async ({ data }: { data: { code: string } }) =>
        makeRoom(data as Partial<PrismaRoom>),
      );

      const service = new RoomsService(prisma as unknown as PrismaService);
      await service.create({ ownerId: 'user-1' });

      const { code } = prisma.room.create.mock.calls[0][0].data;
      expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    });

    it('подставляет название по умолчанию, если имя не задано или состоит из пробелов', async () => {
      const prisma = createPrismaMock();
      prisma.room.findUnique.mockResolvedValue(null);
      prisma.room.create.mockResolvedValue(makeRoom());

      const service = new RoomsService(prisma as unknown as PrismaService);
      await service.create({ ownerId: 'user-1', name: '   ' });

      const { code, name } = prisma.room.create.mock.calls[0][0].data;
      expect(name).toBe(`Комната ${code}`);
    });

    it('повторяет генерацию, если сгенерированный код уже занят', async () => {
      const prisma = createPrismaMock();
      // Первый код занят, второй свободен.
      prisma.room.findUnique.mockResolvedValueOnce(makeRoom()).mockResolvedValue(null);
      prisma.room.create.mockResolvedValue(makeRoom());

      const service = new RoomsService(prisma as unknown as PrismaService);
      await service.create({ ownerId: 'user-1' });

      expect(prisma.room.findUnique).toHaveBeenCalledTimes(2);
      expect(prisma.room.create).toHaveBeenCalledTimes(1);
    });

    it('по умолчанию использует шкалу FIBONACCI', async () => {
      const prisma = createPrismaMock();
      prisma.room.findUnique.mockResolvedValue(null);
      prisma.room.create.mockResolvedValue(makeRoom());

      const service = new RoomsService(prisma as unknown as PrismaService);
      await service.create({ ownerId: 'user-1' });

      expect(prisma.room.create.mock.calls[0][0].data.scaleType).toBe('FIBONACCI');
    });
  });

  describe('findByCode', () => {
    it('возвращает активную комнату', async () => {
      const prisma = createPrismaMock();
      const room = makeRoom();
      prisma.room.findUnique.mockResolvedValue(room);

      const service = new RoomsService(prisma as unknown as PrismaService);
      await expect(service.findByCode('ABC234')).resolves.toBe(room);
    });

    it('бросает 404 для несуществующей комнаты', async () => {
      const prisma = createPrismaMock();
      prisma.room.findUnique.mockResolvedValue(null);

      const service = new RoomsService(prisma as unknown as PrismaService);
      await expect(service.findByCode('NOPE12')).rejects.toThrow(NotFoundException);
    });

    it('бросает 404 для закрытой комнаты', async () => {
      const prisma = createPrismaMock();
      prisma.room.findUnique.mockResolvedValue(makeRoom({ status: 'CLOSED' }));

      const service = new RoomsService(prisma as unknown as PrismaService);
      await expect(service.findByCode('ABC234')).rejects.toThrow(NotFoundException);
    });
  });
});
