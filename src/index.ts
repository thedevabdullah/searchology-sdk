const DEFAULT_BASE_URL = 'https://searchology.duckdns.org'

// ── Types ──────────────────────────────────────────────────────────────────

export interface SearchologyConfig {
  apiKey?:  string
  baseUrl?: string
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
  keys_count:    number
  schema:        Record<string, string>
}

export interface ExtractedField {
  value:      unknown
  confidence: number
}

export interface ExtractResult {
  query:       string
  result:      Record<string, ExtractedField>
  keys_found:  number
  latency_ms:  number
  schema_used: 'builtin' | 'custom'
  suggestions?: string[]
  hint?:        string
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
   * @example
   * const client = new Searchology()
   * const { key } = await client.createApiKey('my-app')
   * // save key to .env as SEARCHOLOGY_API_KEY
   */
  async createApiKey(name: string): Promise<CreateKeyResult> {
    if (!name?.trim()) throw new Error('Searchology: name is required')
    if (name.trim().length > 64) throw new Error('Searchology: name must be 64 characters or less')

    const result = await this.request<CreateKeyResult>('POST', '/register', { name: name.trim() })
    this.apiKey  = result.key
    return result
  }

  /**
   * Get the full built-in schema — all extractable keys with descriptions.
   * No authentication needed.
   *
   * @example
   * const client = new Searchology()
   * const schema = await client.getSchema()
   * console.log(schema.total_keys) // 50+
   */
  async getSchema(): Promise<SchemaResult> {
    return this.request<SchemaResult>('GET', '/schema')
  }

  /**
   * Check your API key status — expiry, request count, custom schema.
   *
   * @example
   * const status = await client.getKeyStatus()
   * console.log(status.expires_in)    // "18 days"
   * console.log(status.requests)      // 142
   * console.log(status.custom_schema) // true/false
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

  /**
   * Save a custom schema against your API key.
   * Keys can be built-in schema keys or completely custom ones.
   * Max 50 keys.
   *
   * @example
   * await client.saveSchema({
   *   color:     'product color e.g. red, blue, black',
   *   price_max: 'maximum price as a number',
   *   brand:     'brand name e.g. nike, apple'
   * })
   */
  async saveSchema(schema: Record<string, string>): Promise<SaveSchemaResult> {
    this.requireApiKey()

    if (!schema || typeof schema !== 'object') {
      throw new Error('Searchology: schema must be an object with key-description pairs')
    }

    return this.request<SaveSchemaResult>('POST', '/key/schema', { schema })
  }

  /**
   * Get your saved custom schema.
   *
   * @example
   * const result = await client.getCustomSchema()
   * console.log(result.schema) // { color: '...', price_max: '...' }
   */
  async getCustomSchema(): Promise<CustomSchemaResult | { custom_schema: null; message: string }> {
    this.requireApiKey()
    return this.request('GET', '/key/schema')
  }

  /**
   * Delete your custom schema — falls back to built-in schema.
   *
   * @example
   * await client.deleteCustomSchema()
   */
  async deleteCustomSchema(): Promise<{ message: string }> {
    this.requireApiKey()
    return this.request('DELETE', '/key/schema')
  }

  /**
   * Extract structured attributes from a natural language query.
   *
   * @param query   — plain English search query (max 500 chars)
   * @param options — { useCustomSchema: true } to use your saved schema
   *
   * @example
   * // use built-in schema (default)
   * const data = await client.extract('black t-shirt under $15')
   *
   * // use your custom schema
   * const data = await client.extract('black t-shirt under $15', { useCustomSchema: true })
   *
   * // check for suggestions when nothing found
   * if (data.keys_found === 0 && data.suggestions) {
   *   console.log('Try:', data.suggestions)
   * }
   */
  async extract(
    query:   string,
    options: { useCustomSchema?: boolean } = {}
  ): Promise<ExtractResult> {
    this.requireApiKey()

    if (!query?.trim()) throw new Error('Searchology: query must be a non-empty string')
    if (query.length > 500) throw new Error(`Searchology: query must be 500 characters or less (got ${query.length})`)

    const path = options.useCustomSchema ? '/extract?schema=true' : '/extract'
    return this.request<ExtractResult>('POST', path, { query })
  }

  // ── private ──────────────────────────────────────────────────────────────

  private requireApiKey(): void {
    if (!this.apiKey) {
      throw new Error('Searchology: no API key set. Pass apiKey in constructor or call createApiKey() first.')
    }
  }

  private async request<T>(method: string, path: string, body?: object): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`

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