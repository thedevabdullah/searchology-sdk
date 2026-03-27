const DEFAULT_BASE_URL   = 'https://searchology.duckdns.org'
const DEFAULT_TIMEOUT_MS = 30_000  // 30 seconds — overridable per-instance

// ── Internal type ─────────────────────────────────────────────────────────────
type HttpMethod = 'GET' | 'POST' | 'DELETE' | 'PATCH' | 'PUT'

// ── Public types ──────────────────────────────────────────────────────────────

export interface SearchologyConfig {
  /** Your API key — get one via createApiKey() or from your dashboard. */
  apiKey?:  string
  /** Override the API base URL. Defaults to the Searchology production server. */
  baseUrl?: string
  /**
   * Request timeout in milliseconds. Defaults to 30 000 (30 seconds).
   * Set to 0 to disable the timeout entirely.
   */
  timeout?: number
}

export interface CreateKeyResult {
  message:    string
  key:        string
  name:       string
  expires_in: string
}

export interface KeyStatusResult {
  status:        'active'
  name:          string
  expires_in:    string | null
  requests:      number
  custom_schema: boolean
}

export interface KeyRefreshResult {
  message:    string
  expires_in: string
}

export interface SchemaResult {
  total_keys: number
  schema:     Record<string, Record<string, string>>
}

export interface SaveSchemaResult {
  message:    string
  keys_saved: number
  keys:       string[]
}

export interface CustomSchemaResult {
  keys_count: number
  schema:     Record<string, string>
}

export interface ExtractedField {
  value:      unknown
  confidence: number
}

export interface ExtractResult {
  query:        string
  result:       Record<string, ExtractedField>
  keys_found:   number
  latency_ms:   number
  schema_used:  'builtin' | 'custom'
  suggestions?: string[]
  hint?:        string
}

export interface SearchologyError {
  error:   string
  message: string
}

// ── Client ────────────────────────────────────────────────────────────────────

export class Searchology {
  private apiKey:  string | null
  private baseUrl: string
  private timeout: number

  constructor(config: SearchologyConfig = {}) {
    // Validate baseUrl if provided — catch obvious mistakes early
    if (config.baseUrl !== undefined) {
      const url = config.baseUrl.trim()
      try { new URL(url) } catch {
        throw new Error(
          `Searchology: baseUrl "${url}" is not a valid URL. ` +
          'It must include the protocol, e.g. https://your-server.com'
        )
      }
    }

    this.apiKey  = config.apiKey?.trim() || null
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '')
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT_MS
  }

  // ── Key management ──────────────────────────────────────────────────────────

  /**
   * Create a new API key. No authentication needed.
   * Call this once, save the returned key, then pass it to the constructor.
   *
   * @param name — a label for this key (your app name, your name, etc.) — max 64 chars
   * @returns `CreateKeyResult` with your key — store it immediately, it is shown only once
   *
   * @example
   * const client = new Searchology()
   * const { key } = await client.createApiKey('my-app')
   * // store key in your .env as SEARCHOLOGY_API_KEY
   */
  async createApiKey(name: string): Promise<CreateKeyResult> {
    const trimmed = name?.trim()
    if (!trimmed)         throw new Error('Searchology: name is required')
    if (trimmed.length > 64) throw new Error('Searchology: name must be 64 characters or less')

    const result = await this.request<CreateKeyResult>('POST', '/register', { name: trimmed })
    this.apiKey  = result.key
    return result
  }

  /**
   * Set or replace the API key on an existing client instance.
   * Useful when you retrieve your stored key after constructing the client.
   *
   * @example
   * const client = new Searchology()
   * client.setApiKey(process.env.SEARCHOLOGY_API_KEY!)
   */
  setApiKey(key: string): void {
    const trimmed = key?.trim()
    if (!trimmed) throw new Error('Searchology: key must be a non-empty string')
    this.apiKey = trimmed
  }

  /**
   * Get the full built-in schema — all extractable keys with descriptions.
   * No authentication needed.
   *
   * @example
   * const client = new Searchology()
   * const schema = await client.getSchema()
   * console.log(schema.total_keys) // 70
   */
  async getSchema(): Promise<SchemaResult> {
    return this.request<SchemaResult>('GET', '/schema')
  }

  /**
   * Check your API key status — expiry, request count, and whether a custom schema is saved.
   *
   * @example
   * const status = await client.getKeyStatus()
   * console.log(status.expires_in)    // "18 days"
   * console.log(status.requests)      // 142
   * console.log(status.custom_schema) // true / false
   */
  async getKeyStatus(): Promise<KeyStatusResult> {
    this.requireApiKey()
    return this.request<KeyStatusResult>('GET', '/key/status')
  }

  /**
   * Refresh your API key expiry — resets to 30 days from today.
   *
   * @example
   * const result = await client.refreshKey()
   * console.log(result.expires_in) // "30 days"
   */
  async refreshKey(): Promise<KeyRefreshResult> {
    this.requireApiKey()
    return this.request<KeyRefreshResult>('POST', '/key/refresh')
  }

  // ── Custom schema ───────────────────────────────────────────────────────────

  /**
   * Save a custom schema against your API key.
   * Once saved, pass `{ useCustomSchema: true }` to `extract()` to use it.
   * Max 50 keys. Each value must be a plain string description.
   *
   * @example
   * await client.saveSchema({
   *   color:     'product color e.g. red, blue, black',
   *   price_max: 'maximum price as a plain number',
   *   brand:     'brand name e.g. nike, apple',
   * })
   */
  async saveSchema(schema: Record<string, string>): Promise<SaveSchemaResult> {
    this.requireApiKey()
    if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
      throw new Error('Searchology: schema must be an object with string key-description pairs')
    }
    return this.request<SaveSchemaResult>('POST', '/key/schema', { schema })
  }

  /**
   * Get your currently saved custom schema.
   * Returns `{ custom_schema: null }` when no custom schema has been saved.
   *
   * @example
   * const result = await client.getCustomSchema()
   * if (result.custom_schema !== null) {
   *   console.log(result.schema) // { color: '...', price_max: '...' }
   * }
   */
  async getCustomSchema(): Promise<CustomSchemaResult | { custom_schema: null; message: string }> {
    this.requireApiKey()
    return this.request('GET', '/key/schema')
  }

  /**
   * Remove your custom schema — extraction reverts to the full built-in schema.
   *
   * @example
   * await client.deleteCustomSchema()
   */
  async deleteCustomSchema(): Promise<{ message: string }> {
    this.requireApiKey()
    return this.request('DELETE', '/key/schema')
  }

  // ── Extraction ──────────────────────────────────────────────────────────────

  /**
   * Extract structured attributes from a plain English search query.
   *
   * @param query   — natural language search query, max 500 characters
   * @param options — `{ useCustomSchema: true }` to extract against your saved schema
   *
   * @example
   * // built-in schema (default)
   * const data = await client.extract('black t-shirt under $15')
   * console.log(data.result.color?.value)      // 'black'
   * console.log(data.result.price_max?.value)  // 15
   *
   * // custom schema
   * const data = await client.extract('black t-shirt under $15', { useCustomSchema: true })
   *
   * // handle zero-result queries
   * if (data.keys_found === 0 && data.suggestions) {
   *   console.log(data.hint)
   *   console.log(data.suggestions)
   * }
   */
  async extract(
    query:   string,
    options: { useCustomSchema?: boolean } = {}
  ): Promise<ExtractResult> {
    this.requireApiKey()
    if (!query?.trim()) throw new Error('Searchology: query must be a non-empty string')
    if (query.length > 500) {
      throw new Error(`Searchology: query must be 500 characters or less (got ${query.length})`)
    }
    const path = options.useCustomSchema ? '/extract?schema=true' : '/extract'
    return this.request<ExtractResult>('POST', path, { query })
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private requireApiKey(): void {
    if (!this.apiKey) {
      throw new Error(
        'Searchology: no API key set. ' +
        'Pass apiKey in the constructor, call setApiKey(), or call createApiKey() first.'
      )
    }
  }

  private async request<T>(method: HttpMethod, path: string, body?: object): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`

    // Attach a timeout via AbortController — keeps fetch from hanging indefinitely
    const controller  = new AbortController()
    const timer       = this.timeout > 0
      ? setTimeout(() => controller.abort(), this.timeout)
      : null

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        signal: controller.signal,
        body:   body ? JSON.stringify(body) : undefined,
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

    } catch (err) {
      // Rethrow SearchologyAPIError as-is — do not double-wrap
      if (err instanceof SearchologyAPIError) throw err

      // Translate AbortError into a clean timeout error
      if (err instanceof Error && err.name === 'AbortError') {
        throw new SearchologyAPIError(
          `Request timed out after ${this.timeout}ms`,
          408,
          'request_timeout'
        )
      }

      throw err
    } finally {
      if (timer !== null) clearTimeout(timer)
    }
  }
}

// ── Custom error class ────────────────────────────────────────────────────────

export class SearchologyAPIError extends Error {
  readonly status:    number
  readonly errorCode: string

  constructor(message: string, status: number, errorCode: string) {
    super(message)
    this.name      = 'SearchologyAPIError'
    this.status    = status
    this.errorCode = errorCode
    // Fix the prototype chain so that instanceof checks work correctly
    // when TypeScript compiles to a target below ES6 or in some bundler contexts.
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export default Searchology