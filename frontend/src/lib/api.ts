import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from './auth-storage';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  /** Не подставлять Authorization (для login/register/refresh) */
  auth?: boolean;
}

/** Попытаться обновить пару токенов через refresh. Возвращает успех. */
async function tryRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { accessToken: string; refreshToken: string };
    setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

async function rawRequest<T>(path: string, options: RequestOptions, retry: boolean): Promise<T> {
  const { method = 'GET', body, auth = true } = options;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  // Истёкший access-токен — пробуем один раз обновить и повторить
  if (res.status === 401 && auth && retry) {
    if (await tryRefresh()) {
      return rawRequest<T>(path, options, false);
    }
    clearSession();
  }

  return parseResponse<T>(res);
}

async function parseResponse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;
  if (!res.ok) {
    const message =
      (data && typeof data.message === 'string' && data.message) ||
      (Array.isArray(data?.message) && data.message.join(', ')) ||
      `Ошибка запроса (${res.status})`;
    throw new ApiError(res.status, message);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string, auth = true) => rawRequest<T>(path, { method: 'GET', auth }, true),
  post: <T>(path: string, body?: unknown, auth = true) =>
    rawRequest<T>(path, { method: 'POST', body, auth }, true),
  patch: <T>(path: string, body?: unknown, auth = true) =>
    rawRequest<T>(path, { method: 'PATCH', body, auth }, true),

  /** Загрузка файла (multipart/form-data) с Bearer и авто-refresh */
  async upload<T>(path: string, formData: FormData): Promise<T> {
    const doUpload = async (): Promise<Response> => {
      const headers: Record<string, string> = {};
      const token = getAccessToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
      return fetch(`${API_URL}${path}`, { method: 'POST', headers, body: formData });
    };
    let res = await doUpload();
    if (res.status === 401 && (await tryRefresh())) {
      res = await doUpload();
    }
    return parseResponse<T>(res);
  },
};
