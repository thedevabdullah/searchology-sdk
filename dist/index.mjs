// src/index.ts
var DEFAULT_BASE_URL = "https://searchology.duckdns.org";
var Searchology = class {
  constructor(config = {}) {
    this.apiKey = config.apiKey ?? null;
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
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
  async createApiKey(name) {
    if (!name || typeof name !== "string" || name.trim() === "") {
      throw new Error("Searchology: name is required");
    }
    if (name.trim().length > 64) {
      throw new Error("Searchology: name must be 64 characters or less");
    }
    const response = await fetch(`${this.baseUrl}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() })
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new SearchologyAPIError(
        err.message ?? `Request failed with status ${response.status}`,
        response.status,
        err.error ?? "unknown_error"
      );
    }
    const result = await response.json();
    this.apiKey = result.key;
    return result;
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
  async extract(query) {
    if (!this.apiKey) {
      throw new Error(
        "Searchology: no API key set. Pass apiKey in constructor or call createApiKey() first."
      );
    }
    if (!query || typeof query !== "string") {
      throw new Error("Searchology: query must be a non-empty string");
    }
    if (query.length > 500) {
      throw new Error(`Searchology: query must be 500 characters or less (got ${query.length})`);
    }
    const response = await fetch(`${this.baseUrl}/extract`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({ query })
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new SearchologyAPIError(
        err.message ?? `Request failed with status ${response.status}`,
        response.status,
        err.error ?? "unknown_error"
      );
    }
    return response.json();
  }
};
var SearchologyAPIError = class extends Error {
  constructor(message, status, errorCode) {
    super(message);
    this.name = "SearchologyAPIError";
    this.status = status;
    this.errorCode = errorCode;
  }
};
var index_default = Searchology;
export {
  Searchology,
  SearchologyAPIError,
  index_default as default
};
