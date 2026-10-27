const API_URL = import.meta.env.VITE_API_URL as string

/** Monta a URL completa de um caminho da API (usado em <img src>, que não passa pelo api()). */
export function apiUrl(path: string): string {
  return `${API_URL}${path}`
}

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

// Erros de validação (422) chegam como lista: [{ msg: 'Value error, ...' }, ...].
// As regras dos models (ex.: e-mail ou CPF repetido) chegam como objeto: { 'pessoa.email': ['...'] }.
function errorMessage(detail: unknown): string | undefined {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    const msgs = detail
      .map((item) => (typeof item?.msg === 'string' ? item.msg.replace(/^Value error, /, '') : ''))
      .filter(Boolean)
    if (msgs.length > 0) return msgs.join(' ')
  }
  if (detail && typeof detail === 'object') {
    const msgs = Object.values(detail as Record<string, unknown>)
      .flat()
      .filter((msg): msg is string => typeof msg === 'string')
    if (msgs.length > 0) return msgs.join(' ')
  }
  return undefined
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  // Em upload (FormData) NÃO podemos definir o Content-Type: o navegador coloca sozinho,
  // com o "boundary" que separa os campos. Para JSON, continua application/json.
  const isFormData = options.body instanceof FormData

  const request = (token: string | null) =>
    fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
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
    throw new Error(errorMessage(detail.detail) ?? `Erro ${res.status}`)
  }

  return res.status === 204 ? (null as T) : ((await res.json()) as T)
}