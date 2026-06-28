/**
 * Вернуть безопасный внутренний путь для редиректа после логина/регистрации.
 * Допускаем только относительные пути вида `/room/ABC` — без протокола и без `//`
 * (защита от open-redirect на внешние домены). Иначе — фолбэк `/`.
 */
export function safeReturnTo(returnTo: string | null | undefined): string {
  if (!returnTo) return '/';
  if (!returnTo.startsWith('/') || returnTo.startsWith('//')) return '/';
  return returnTo;
}
