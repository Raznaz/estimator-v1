import { io, type Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

let socket: Socket | null = null;

/**
 * Ленивая инициализация единого Socket.IO-клиента.
 * autoConnect выключен — подключаемся явно при входе в комнату.
 */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_URL, {
      autoConnect: false,
      transports: ['websocket'],
    });
  }
  return socket;
}
