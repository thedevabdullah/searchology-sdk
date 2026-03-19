const DEFAULT_BASE_URL = 'https://searchology.duckdns.org'

// ── Types ──────────────────────────────────────────────────────────────────

export interface SearchologyConfig {
  apiKey?:  string   // optional at init — user may call createApiKey() first
  baseUrl?: string
}

export interface CreateKeyResult {
  message:    string
  id:         string
  key:        string   // sk_live_xxx — save this, shown only once
  name:       string
  created_at: string
}

export interface ExtractResult {
  query:      string
  result:     SearchAttributes
  keys_found: number
  latency_ms: number
}

export interface SearchAttributes {
  // Product Identity
  product_type?:     string
  product_name?:     string
  brand?:            string
  model?:            string
  category?:         string
  subcategory?:      string
  // Physical
  color?:            string
  color_secondary?:  string
  size?:             string
  size_type?:        string
  material?:         string
  pattern?:          string
  shape?:            string
  weight?:           string
  dimensions?:       string
  // Target Person
  gender?:           'male' | 'female' | 'unisex'
  age?:              number
  age_group?:        string
  relationship?:     string
  profession?:       string
  // Occasion & Usage
  occasion?:         string
  season?:           string
  weather?:          string
  usage?:            string
  activity?:         string
  // Pricing
  price_max?:        number
  price_min?:        number
  currency?:         string
  budget_label?:     'budget' | 'mid-range' | 'premium' | 'luxury'
  discount?:         boolean
  // Quality & Condition
  condition?:        'new' | 'used' | 'refurbished' | 'open-box'
  quality_tier?:     string
  rating_min?:       number
  certification?:    string
  // Delivery
  delivery_speed?:   'same-day' | 'next-day' | 'express' | 'standard'
  location?:         string
  availability?:     string
  seller_type?:      string
  // Electronics
  storage?:          string
  ram?:              string
  battery?:          string
  display_size?:     string
  connectivity?:     string
  operating_system?: string
  processor?:        string
  // Style
  style?:            string
  fit?:              string
  neckline?:         string
  sleeve?:           string
  aesthetic?:        string
  // Special
  eco_friendly?:     boolean
  handmade?:         boolean
  customizable?:     boolean
  gift_wrap?:        boolean
  quantity?:         number | string
  language?:         string
  // allow any extra keys from custom schemas
  [key: string]:     unknown
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
   * Call this once, save the returned key, then use it for extract().
   *
   * @param name — a label for this key (your app name, your name, etc.)
   * @returns CreateKeyResult with your key — save it, shown only once
   *
   * @example
   * const client = new Searchology()
   * const { key } = await client.createApiKey('my-app')
   * // save key to your .env or config
   * // key = 'sk_live_xxxxxxxxxxxxxxxx'
   */
  async createApiKey(name: string): Promise<CreateKeyResult> {
    if (!name || typeof name !== 'string' || name.trim() === '') {
      throw new Error('Searchology: name is required')
    }

    if (name.trim().length > 64) {
      throw new Error('Searchology: name must be 64 characters or less')
    }

    const response = await fetch(`${this.baseUrl}/register`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name: name.trim() })
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({})) as SearchologyError
      throw new SearchologyAPIError(
        err.message ?? `Request failed with status ${response.status}`,
        response.status,
        err.error   ?? 'unknown_error'
      )
    }

    const result = await response.json() as CreateKeyResult

    // auto-set the key on this instance so extract() works immediately
    this.apiKey = result.key

    return result
  }

  /**
   * Extract structured attributes from a natural language query.
   * Requires an API key — either passed in constructor or via createApiKey().
   *
   * @param query — plain English search query (max 500 chars)
   * @returns structured JSON with extracted attributes
   *
   * @example
   * const client = new Searchology({ apiKey: 'sk_live_xxxxxxxx' })
   * const { result } = await client.extract('black t-shirt under $15')
   * // { color: 'black', product_type: 't-shirt', price_max: 15 }
   */
  async extract(query: string): Promise<ExtractResult> {
    if (!this.apiKey) {
      throw new Error(
        'Searchology: no API key set. ' +
        'Pass apiKey in constructor or call createApiKey() first.'
      )
    }

    if (!query || typeof query !== 'string') {
      throw new Error('Searchology: query must be a non-empty string')
    }

    if (query.length > 500) {
      throw new Error(`Searchology: query must be 500 characters or less (got ${query.length})`)
    }

    const response = await fetch(`${this.baseUrl}/extract`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({ query })
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({})) as SearchologyError
      throw new SearchologyAPIError(
        err.message ?? `Request failed with status ${response.status}`,
        response.status,
        err.error   ?? 'unknown_error'
      )
    }

    return response.json() as Promise<ExtractResult>
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

// ── Default export ─────────────────────────────────────────────────────────

export default Searchology