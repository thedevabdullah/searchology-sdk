const DEFAULT_BASE_URL = 'https://searchology.duckdns.org'

// ── Types ──────────────────────────────────────────────────────────────────

export interface SearchologyConfig {
  apiKey?:  string
  baseUrl?: string
}

export interface CreateKeyResult {
  message:    string
  key:        string   // sgy_xxx — save this
  name:       string
  expires_in: string   // "30 days"
}

// key status response — clean user-facing fields only
export interface KeyStatusResult {
  status:     'active'
  name:       string
  expires_in: string | null  // "18 days" or null
  requests:   number
}

// key refresh response — minimal confirmation
export interface KeyRefreshResult {
  message:    string
  expires_in: string  // "30 days"
}

export interface ExtractedField {
  value:      unknown
  confidence: number
}

export interface ExtractResult {
  query:      string
  result:     Record<string, ExtractedField>
  keys_found: number
  latency_ms: number
}

export interface SearchologyError {
  error:   string
  message: string
}

// ── Client Class ───────────────────────────────────────────────────────────

export class Searchology {
  private apiKey:  string | null
  private baseUrl: string

  constructor(config: SearchologyConfig = {}) {
    this.apiKey  = config.apiKey ?? null
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '')
  }

  /**
   * Create a new API key. No authentication needed.
   * Call this once, save the returned key, use it for all other methods.
   *
   * @param name — a label for this key (your app name, client name, etc.)
   * @returns { key, name, expires_in } — save the key, shown only once
   *
   * @example
   * const client = new Searchology()
   * const { key } = await client.createApiKey('my-app')
   * // key = 'sgy_xxxxxxxxxxxxxxxx' — save this to your .env
   */
  async createApiKey(name: string): Promise<CreateKeyResult> {
    if (!name || typeof name !== 'string' || name.trim() === '') {
      throw new Error('Searchology: name is required')
    }
    if (name.trim().length > 64) {
      throw new Error('Searchology: name must be 64 characters or less')
    }

    const result = await this.request<CreateKeyResult>('POST', '/register', { name: name.trim() })

    // auto-set key on instance so other methods work immediately after
    this.apiKey = result.key

    return result
  }

  /**
   * Check the status of your API key.
   * Returns active status, days remaining, and request count.
   *
   * @returns { status, name, expires_in, requests }
   *
   * @example
   * const client = new Searchology({ apiKey: 'sgy_xxx' })
   * const status = await client.getKeyStatus()
   * console.log(status.expires_in)  // "18 days"
   * console.log(status.requests)    // 142
   */
  async getKeyStatus(): Promise<KeyStatusResult> {
    this.requireApiKey()
    return this.request<KeyStatusResult>('GET', '/key/status')
  }

  /**
   * Refresh your API key expiry — resets to 30 days from today.
   * Same key string, same history, just extended expiry.
   * Call this before your key expires to keep access uninterrupted.
   *
   * @returns { message, expires_in }
   *
   * @example
   * const client = new Searchology({ apiKey: 'sgy_xxx' })
   * const result = await client.refreshKey()
   * console.log(result.expires_in)  // "30 days"
   * console.log(result.message)     // "Key expiry refreshed successfully"
   */
  async refreshKey(): Promise<KeyRefreshResult> {
    this.requireApiKey()
    return this.request<KeyRefreshResult>('POST', '/key/refresh')
  }

  /**
   * Extract structured attributes from a natural language query.
   *
   * @param query — plain English search query (max 500 chars)
   * @returns { query, result, keys_found, latency_ms }
   *
   * @example
   * const client = new Searchology({ apiKey: 'sgy_xxx' })
   * const data = await client.extract('black t-shirt under $15')
   * data.result.color.value      // 'black'
   * data.result.color.confidence // 1.0
   */
  async extract(query: string): Promise<ExtractResult> {
    this.requireApiKey()

    if (!query || typeof query !== 'string') {
      throw new Error('Searchology: query must be a non-empty string')
    }
    if (query.length > 500) {
      throw new Error(`Searchology: query must be 500 characters or less (got ${query.length})`)
    }

    return this.request<ExtractResult>('POST', '/extract', { query })
  }

  // ── private ──────────────────────────────────────────────────────────────

  private requireApiKey(): void {
    if (!this.apiKey) {
      throw new Error(
        'Searchology: no API key set. ' +
        'Pass apiKey in constructor or call createApiKey() first.'
      )
    }
  }

  private async request<T>(method: string, path: string, body?: object): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({})) as SearchologyError
      throw new SearchologyAPIError(
        err.message ?? `Request failed with status ${response.status}`,
        response.status,
        err.error   ?? 'unknown_error'
      )
    }

    return response.json() as Promise<T>
  }
}

// ── Custom Error ───────────────────────────────────────────────────────────

export class SearchologyAPIError extends Error {
  status:    number
  errorCode: string

  constructor(message: string, status: number, errorCode: string) {
    super(message)
    this.name      = 'SearchologyAPIError'
    this.status    = status
    this.errorCode = errorCode
  }
}

export default Searchology