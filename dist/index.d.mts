interface SearchologyConfig {
    apiKey?: string;
    baseUrl?: string;
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
    constructor(config?: SearchologyConfig);
    /**
     * Create a new API key. No authentication needed.
     * Call this once, save the returned key, use it for all other methods.
     *
     * @example
     * const client = new Searchology()
     * const { key } = await client.createApiKey('my-app')
     * // save key to .env as SEARCHOLOGY_API_KEY
     */
    createApiKey(name: string): Promise<CreateKeyResult>;
    /**
     * Get the full built-in schema — all extractable keys with descriptions.
     * No authentication needed.
     *
     * @example
     * const client = new Searchology()
     * const schema = await client.getSchema()
     * console.log(schema.total_keys) // 50+
     */
    getSchema(): Promise<SchemaResult>;
    /**
     * Check your API key status — expiry, request count, custom schema.
     *
     * @example
     * const status = await client.getKeyStatus()
     * console.log(status.expires_in)    // "18 days"
     * console.log(status.requests)      // 142
     * console.log(status.custom_schema) // true/false
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
    saveSchema(schema: Record<string, string>): Promise<SaveSchemaResult>;
    /**
     * Get your saved custom schema.
     *
     * @example
     * const result = await client.getCustomSchema()
     * console.log(result.schema) // { color: '...', price_max: '...' }
     */
    getCustomSchema(): Promise<CustomSchemaResult | {
        custom_schema: null;
        message: string;
    }>;
    /**
     * Delete your custom schema — falls back to built-in schema.
     *
     * @example
     * await client.deleteCustomSchema()
     */
    deleteCustomSchema(): Promise<{
        message: string;
    }>;
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
    extract(query: string, options?: {
        useCustomSchema?: boolean;
    }): Promise<ExtractResult>;
    private requireApiKey;
    private request;
}
declare class SearchologyAPIError extends Error {
    status: number;
    errorCode: string;
    constructor(message: string, status: number, errorCode: string);
}

export { type CreateKeyResult, type CustomSchemaResult, type ExtractResult, type ExtractedField, type KeyRefreshResult, type KeyStatusResult, type SaveSchemaResult, type SchemaResult, Searchology, SearchologyAPIError, type SearchologyConfig, type SearchologyError, Searchology as default };
