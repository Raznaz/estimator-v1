/**
 * Отображаемое имя для входа в комнату (имя гостя или зарегистрированного
 * пользователя). Хранится отдельно от auth-сессии, чтобы переживать переходы
 * по ссылке-приглашению.
 */

const NAME_KEY = 'pp_display_name';

const isBrowser = typeof window !== 'undefined';

export function getDisplayName(): string | null {
  return isBrowser ? window.localStorage.getItem(NAME_KEY) : null;
}

export function setDisplayName(name: string): void {
  if (!isBrowser) return;
  window.localStorage.setItem(NAME_KEY, name);
}
