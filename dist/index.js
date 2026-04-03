"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  Searchology: () => Searchology,
  SearchologyAPIError: () => SearchologyAPIError,
  default: () => index_default
});
module.exports = __toCommonJS(index_exports);
var DEFAULT_BASE_URL = "https://searchology.duckdns.org";
var DEFAULT_TIMEOUT_MS = 3e4;
var Searchology = class {
  constructor(config = {}) {
    if (config.baseUrl !== void 0) {
      const url = config.baseUrl.trim();
      try {
        new URL(url);
      } catch {
        throw new Error(
          `Searchology: baseUrl "${url}" is not a valid URL. It must include the protocol, e.g. https://your-server.com`
        );
      }
    }
    this.apiKey = config.apiKey?.trim() || null;
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT_MS;
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
  async createApiKey(name) {
    const trimmed = name?.trim();
    if (!trimmed) throw new Error("Searchology: name is required");
    if (trimmed.length > 64) throw new Error("Searchology: name must be 64 characters or less");
    const result = await this.request("POST", "/register", { name: trimmed });
    this.apiKey = result.key;
    return result;
  }
  /**
   * Set or replace the API key on an existing client instance.
   * Useful when you retrieve your stored key after constructing the client.
   *
   * @example
   * const client = new Searchology()
   * client.setApiKey(process.env.SEARCHOLOGY_API_KEY!)
   */
  setApiKey(key) {
    const trimmed = key?.trim();
    if (!trimmed) throw new Error("Searchology: key must be a non-empty string");
    this.apiKey = trimmed;
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
  async getSchema() {
    return this.request("GET", "/schema");
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
  async getKeyStatus() {
    this.requireApiKey();
    return this.request("GET", "/key/status");
  }
  /**
   * Refresh your API key expiry — resets to 30 days from today.
   *
   * @example
   * const result = await client.refreshKey()
   * console.log(result.expires_in) // "30 days"
   */
  async refreshKey() {
    this.requireApiKey();
    return this.request("POST", "/key/refresh");
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
  async saveSchema(schema) {
    this.requireApiKey();
    if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
      throw new Error("Searchology: schema must be an object with string key-description pairs");
    }
    return this.request("POST", "/key/schema", { schema });
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
  async getCustomSchema() {
    this.requireApiKey();
    return this.request("GET", "/key/schema");
  }
  /**
   * Remove your custom schema — extraction reverts to the full built-in schema.
   *
   * @example
   * await client.deleteCustomSchema()
   */
  async deleteCustomSchema() {
    this.requireApiKey();
    return this.request("DELETE", "/key/schema");
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
  async extract(query, options = {}) {
    this.requireApiKey();
    if (!query?.trim()) throw new Error("Searchology: query must be a non-empty string");
    if (query.length > 500) {
      throw new Error(`Searchology: query must be 500 characters or less (got ${query.length})`);
    }
    const path = options.useCustomSchema ? "/extract?schema=true" : "/extract";
    return this.request("POST", path, { query });
  }
  // ── Private helpers ─────────────────────────────────────────────────────────
  requireApiKey() {
    if (!this.apiKey) {
      throw new Error(
        "Searchology: no API key set. Pass apiKey in the constructor, call setApiKey(), or call createApiKey() first."
      );
    }
  }
  async request(method, path, body) {
    const headers = { "Content-Type": "application/json" };
    if (this.apiKey) headers["Authorization"] = `Bearer ${this.apiKey}`;
    const controller = new AbortController();
    const timer = this.timeout > 0 ? setTimeout(() => controller.abort(), this.timeout) : null;
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        signal: controller.signal,
        body: body ? JSON.stringify(body) : void 0
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
    } catch (err) {
      if (err instanceof SearchologyAPIError) throw err;
      if (err instanceof Error && err.name === "AbortError") {
        throw new SearchologyAPIError(
          `Request timed out after ${this.timeout}ms`,
          408,
          "request_timeout"
        );
      }
      throw err;
    } finally {
      if (timer !== null) clearTimeout(timer);
    }
  }
};
var SearchologyAPIError = class extends Error {
  constructor(message, status, errorCode) {
    super(message);
    this.name = "SearchologyAPIError";
    this.status = status;
    this.errorCode = errorCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
};
var index_default = Searchology;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Searchology,
  SearchologyAPIError
});
