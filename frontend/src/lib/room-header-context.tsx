'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

/** Данные активной комнаты, которые показываем в глобальном хедере. */
export interface RoomHeaderInfo {
  code: string;
  name: string | null;
}

interface RoomHeaderContextValue {
  info: RoomHeaderInfo | null;
  setInfo: (info: RoomHeaderInfo | null) => void;
}

const RoomHeaderContext = createContext<RoomHeaderContextValue | null>(null);

/**
 * Контекст-«слот»: экран комнаты кладёт сюда свои код/название, а AppHeader
 * (общий для всех страниц) их отрисовывает вместе с кнопкой приглашения.
 */
export function RoomHeaderProvider({ children }: { children: ReactNode }) {
  const [info, setInfo] = useState<RoomHeaderInfo | null>(null);
  const value = useMemo(() => ({ info, setInfo }), [info]);
  return <RoomHeaderContext.Provider value={value}>{children}</RoomHeaderContext.Provider>;
}

export function useRoomHeader(): RoomHeaderContextValue {
  const ctx = useContext(RoomHeaderContext);
  if (!ctx) throw new Error('useRoomHeader must be used within RoomHeaderProvider');
  return ctx;
}
