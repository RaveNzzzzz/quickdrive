const API_URL = import.meta.env.VITE_API_URL as string

const ACCESS_KEY = 'access_token'
const REFRESH_KEY = 'refresh_token'

export const tokens = {
  get access() {
    return localStorage.getItem(ACCESS_KEY)
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY)
  },
  set(access: string, refresh?: string) {
    localStorage.setItem(ACCESS_KEY, access)
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh)
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}

async function refreshAccessToken(): Promise<boolean> {
  const refresh = tokens.refresh
  if (!refresh) return false

  const res = await fetch(`${API_URL}/token/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  })

  if (!res.ok) {
    tokens.clear()
    return false
  }

  const data = await res.json()
  tokens.set(data.access, data.refresh)
  return true
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const request = (token: string | null) =>
    fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    })

  let res = await request(tokens.access)

  if (res.status === 401 && (await refreshAccessToken())) {
    res = await request(tokens.access)
  }

  if (!res.ok) {
    const detail = await res.json().catch(() => ({}))
    throw new Error(detail.detail ?? `Erro ${res.status}`)
  }

  return res.status === 204 ? (null as T) : ((await res.json()) as T)
}
