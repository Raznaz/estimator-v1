import { io, type Socket } from 'socket.io-client';
import { getAccessToken } from './auth-storage';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

let socket: Socket | null = null;

/**
 * Ленивая инициализация единого Socket.IO-клиента.
 * autoConnect выключен — подключаемся явно при входе в комнату.
 * Перед подключением актуализируем JWT-токен (для зарегистрированных
 * пользователей); гости подключаются без токена.
 */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_URL, {
      autoConnect: false,
      transports: ['websocket'],
    });
  }
  const token = getAccessToken();
  socket.auth = token ? { token } : {};
  return socket;
}
