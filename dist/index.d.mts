interface SearchologyConfig {
    /** Your API key — get one via createApiKey() or from your dashboard. */
    apiKey?: string;
    /** Override the API base URL. Defaults to the Searchology production server. */
    baseUrl?: string;
    /**
     * Request timeout in milliseconds. Defaults to 30 000 (30 seconds).
     * Set to 0 to disable the timeout entirely.
     */
    timeout?: number;
}
interface CreateKeyResult {
    message: string;
    key: string;
    name: string;
    expires_in: string;
}
interface KeyStatusResult {
    status: 'active';
    name: string;
    expires_in: string | null;
    requests: number;
    custom_schema: boolean;
}
interface KeyRefreshResult {
    message: string;
    expires_in: string;
}
interface SchemaResult {
    total_keys: number;
    schema: Record<string, Record<string, string>>;
}
interface SaveSchemaResult {
    message: string;
    keys_saved: number;
    keys: string[];
}
interface CustomSchemaResult {
    keys_count: number;
    schema: Record<string, string>;
}
interface ExtractedField {
    value: unknown;
    confidence: number;
}
interface ExtractResult {
    query: string;
    result: Record<string, ExtractedField>;
    keys_found: number;
    latency_ms: number;
    schema_used: 'builtin' | 'custom';
    suggestions?: string[];
    hint?: string;
}
interface SearchologyError {
    error: string;
    message: string;
}
declare class Searchology {
    private apiKey;
    private baseUrl;
    private timeout;
    constructor(config?: SearchologyConfig);
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
    createApiKey(name: string): Promise<CreateKeyResult>;
    /**
     * Set or replace the API key on an existing client instance.
     * Useful when you retrieve your stored key after constructing the client.
     *
     * @example
     * const client = new Searchology()
     * client.setApiKey(process.env.SEARCHOLOGY_API_KEY!)
     */
    setApiKey(key: string): void;
    /**
     * Get the full built-in schema — all extractable keys with descriptions.
     * No authentication needed.
     *
     * @example
     * const client = new Searchology()
     * const schema = await client.getSchema()
     * console.log(schema.total_keys) // 70
     */
    getSchema(): Promise<SchemaResult>;
    /**
     * Check your API key status — expiry, request count, and whether a custom schema is saved.
     *
     * @example
     * const status = await client.getKeyStatus()
     * console.log(status.expires_in)    // "18 days"
     * console.log(status.requests)      // 142
     * console.log(status.custom_schema) // true / false
     */
    getKeyStatus(): Promise<KeyStatusResult>;
    /**
     * Refresh your API key expiry — resets to 30 days from today.
     *
     * @example
     * const result = await client.refreshKey()
     * console.log(result.expires_in) // "30 days"
     */
    refreshKey(): Promise<KeyRefreshResult>;
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
    saveSchema(schema: Record<string, string>): Promise<SaveSchemaResult>;
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
    getCustomSchema(): Promise<CustomSchemaResult | {
        custom_schema: null;
        message: string;
    }>;
    /**
     * Remove your custom schema — extraction reverts to the full built-in schema.
     *
     * @example
     * await client.deleteCustomSchema()
     */
    deleteCustomSchema(): Promise<{
        message: string;
    }>;
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
    extract(query: string, options?: {
        useCustomSchema?: boolean;
    }): Promise<ExtractResult>;
    private requireApiKey;
    private request;
}
declare class SearchologyAPIError extends Error {
    readonly status: number;
    readonly errorCode: string;
    constructor(message: string, status: number, errorCode: string);
}

export { type CreateKeyResult, type CustomSchemaResult, type ExtractResult, type ExtractedField, type KeyRefreshResult, type KeyStatusResult, type SaveSchemaResult, type SchemaResult, Searchology, SearchologyAPIError, type SearchologyConfig, type SearchologyError, Searchology as default };
